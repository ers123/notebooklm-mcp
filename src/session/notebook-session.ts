import { randomUUID } from 'node:crypto';
import type { Page } from 'patchright';
import type { QueryResult, AudioOverview, NotebookSummary, SourceDescription, SanitizeResult } from '../types.js';
import { BASE_URL, QUERY_TIMEOUT, NAVIGATION_TIMEOUT } from '../config.js';
import { safeGoto, typeText, clickElement, extractText, waitForSelector } from '../browser/page-helpers.js';
import { sanitizeResponse } from '../security/response-sanitizer.js';
import { actionDelay, navigationDelay } from '../utils/timing.js';
import { logger } from '../utils/logger.js';
import { SessionError, TimeoutError } from '../errors.js';

// NotebookLM UI selectors (best-effort — may need updates as UI changes)
const SELECTORS = {
  // Chat input area
  queryInput: 'textarea[aria-label*="query"], textarea[placeholder*="Ask"], .query-input textarea, [contenteditable="true"][data-placeholder]',
  // Submit button
  submitButton: 'button[aria-label*="Send"], button[aria-label*="submit"], .query-submit-button',
  // Response container
  responseContainer: '.response-content, .chat-response, [data-response], .markdown-content',
  // Loading indicator
  loadingIndicator: '.loading-indicator, [aria-busy="true"], .thinking-indicator',
  // Sources panel
  sourcesPanel: '.sources-panel, .source-list, [data-sources]',
  // Individual source items
  sourceItem: '.source-item, .source-card, [data-source-id]',
  // Audio overview button
  audioButton: 'button[aria-label*="Audio"], button[aria-label*="audio overview"], .audio-overview-button',
  // Audio generation status
  audioStatus: '.audio-status, .audio-generation-status',
  // Summary section
  summarySection: '.notebook-summary, .summary-content, [data-summary]',
  // Notebook list on home page
  notebookList: '.notebook-list, .notebook-grid, [data-notebook-list]',
  // Individual notebook cards
  notebookCard: '.notebook-card, .notebook-item, [data-notebook-id]',
  // Notebook title
  notebookTitle: '.notebook-title, h1, [data-notebook-title]',
};

export class NotebookSession {
  readonly id: string;
  readonly notebookId: string;
  readonly createdAt: number;
  lastActivity: number;
  private page: Page | null = null;

  constructor(notebookId: string) {
    this.id = randomUUID();
    this.notebookId = notebookId;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }

  setPage(page: Page): void {
    this.page = page;
  }

  getPage(): Page | null {
    return this.page;
  }

  private touch(): void {
    this.lastActivity = Date.now();
  }

  private requirePage(): Page {
    if (!this.page) {
      throw new SessionError('Session has no page — it may have been closed');
    }
    return this.page;
  }

  async navigate(): Promise<void> {
    const page = this.requirePage();
    const url = `${BASE_URL}/notebook/${this.notebookId}`;
    await safeGoto(page, url);
    await navigationDelay();
    this.touch();
    logger.info(`Navigated to notebook: ${this.notebookId}`);
  }

  async askQuestion(question: string): Promise<QueryResult> {
    const page = this.requirePage();
    this.touch();

    try {
      // Wait for and type into query input
      await waitForSelector(page, SELECTORS.queryInput, NAVIGATION_TIMEOUT);
      await typeText(page, SELECTORS.queryInput, question);
      await actionDelay();

      // Submit the question
      await clickElement(page, SELECTORS.submitButton);

      // Wait for loading to start, then finish
      try {
        await page.waitForSelector(SELECTORS.loadingIndicator, { timeout: 5000 });
      } catch {
        // Loading indicator might appear and disappear quickly
      }

      // Wait for loading to finish
      await page.waitForFunction(
        (sel: string) => !document.querySelector(sel),
        SELECTORS.loadingIndicator,
        { timeout: QUERY_TIMEOUT }
      );

      await actionDelay();

      // Extract the response
      const result = await extractText(page, SELECTORS.responseContainer);

      this.touch();

      return {
        answer: result.clean,
        sessionId: this.id,
        warnings: result.warnings,
      };
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw error;
      }
      throw new SessionError(
        `Failed to ask question in notebook ${this.notebookId}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async askFollowup(question: string): Promise<QueryResult> {
    // Followup is the same flow — NotebookLM maintains context in the same page
    return this.askQuestion(question);
  }

  async generateAudioOverview(): Promise<AudioOverview> {
    const page = this.requirePage();
    this.touch();

    try {
      await clickElement(page, SELECTORS.audioButton);
      await actionDelay();

      // Audio generation can take a long time — wait up to 5 minutes
      const AUDIO_TIMEOUT = 5 * 60 * 1000;

      try {
        await page.waitForSelector(SELECTORS.audioStatus, { timeout: 10000 });
      } catch {
        // Status element might not appear immediately
      }

      // Wait for generation to complete (status element changes or disappears)
      await page.waitForFunction(
        (sel: string) => {
          const el = document.querySelector(sel);
          if (!el) return true; // Element gone = done
          const text = (el as HTMLElement).innerText.toLowerCase();
          return text.includes('ready') || text.includes('complete') || text.includes('play');
        },
        SELECTORS.audioStatus,
        { timeout: AUDIO_TIMEOUT }
      );

      this.touch();

      return {
        status: 'ready',
        message: 'Audio overview generated successfully',
      };
    } catch (error) {
      return {
        status: 'failed',
        message: `Audio generation failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      };
    }
  }

  async getSummary(): Promise<NotebookSummary> {
    const page = this.requirePage();
    this.touch();

    try {
      // Try to find an existing summary section
      const summaryResult = await extractText(page, SELECTORS.summarySection);

      // Count sources
      const sourceCount = await page.$$eval(
        SELECTORS.sourceItem,
        (elements: Element[]) => elements.length
      ).catch(() => 0);

      this.touch();

      return {
        summary: summaryResult.clean,
        sourceCount,
        warnings: summaryResult.warnings,
      };
    } catch {
      // If no summary section exists, ask NotebookLM to generate one
      const result = await this.askQuestion('Provide a comprehensive summary of all the sources in this notebook.');
      return {
        summary: result.answer,
        sourceCount: 0,
        warnings: result.warnings,
      };
    }
  }

  async describeSources(): Promise<SourceDescription[]> {
    const page = this.requirePage();
    this.touch();

    try {
      await waitForSelector(page, SELECTORS.sourcesPanel, NAVIGATION_TIMEOUT);

      const sources = await page.$$eval(SELECTORS.sourceItem, (elements: Element[]) => {
        return elements.map(el => {
          const titleEl = el.querySelector('.source-title, h3, [data-source-title]');
          const typeEl = el.querySelector('.source-type, [data-source-type]');
          const dateEl = el.querySelector('.source-date, [data-source-date]');
          return {
            title: titleEl?.textContent?.trim() || 'Unknown',
            type: typeEl?.textContent?.trim() || 'Unknown',
            addedAt: dateEl?.textContent?.trim() || undefined,
          };
        });
      });

      this.touch();

      // Sanitize each source title
      return sources.map(s => ({
        ...s,
        title: sanitizeResponse(s.title).clean,
        type: sanitizeResponse(s.type).clean,
      }));
    } catch {
      // Fall back to asking NotebookLM
      const result = await this.askQuestion('List all sources in this notebook with their titles and types.');
      return [{
        title: 'Source list via query',
        type: 'query-result',
        addedAt: undefined,
      }];
    }
  }

  async close(): Promise<void> {
    if (this.page) {
      try {
        await this.page.close();
      } catch {
        // Page might already be closed
      }
      this.page = null;
    }
    logger.info(`Session closed: ${this.id}`);
  }

  isIdle(timeoutMs: number): boolean {
    return Date.now() - this.lastActivity > timeoutMs;
  }

  toInfo() {
    return {
      id: this.id,
      notebookId: this.notebookId,
      lastActivity: this.lastActivity,
      createdAt: this.createdAt,
    };
  }
}
