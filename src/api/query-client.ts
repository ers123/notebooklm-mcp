import { CookieStore } from '../auth/cookie-store.js';
import { BASE_URL, QUERY_STREAM_URL, QUERY_TIMEOUT } from '../config.js';
import { AuthError, TimeoutError, ValidationError } from '../errors.js';
import { stripAntiXssi } from './response-parser.js';
import { logger } from '../utils/logger.js';
import { sanitizeResponse } from '../security/response-sanitizer.js';
import type { CookieData, QueryStreamResult } from '../types.js';

const CSRF_REGEX = /SNlM0e":"([^"]+)"/;

export class QueryClient {
  private cookieStore: CookieStore;
  private csrfToken: string | null = null;
  private csrfTokenExpiry: number = 0;
  private reqidCounter: number = 100000;

  // Cache conversation history per notebook for follow-up support
  private conversationCache: Map<string, unknown[]> = new Map();

  constructor(cookieStore: CookieStore) {
    this.cookieStore = cookieStore;
  }

  /**
   * Send a query to a notebook using GenerateFreeFormStreamed.
   */
  async query(
    notebookId: string,
    question: string,
    isFollowUp: boolean = false,
  ): Promise<QueryStreamResult> {
    const cookies = await this.cookieStore.loadCookies();
    if (cookies.length === 0) {
      throw new AuthError('No cookies available. Run setup_auth to authenticate.');
    }

    const csrf = await this.getCsrfToken(cookies);
    const cookieHeader = this.buildCookieHeader(cookies);
    const reqid = this.getNextReqId();

    // Build conversation history for follow-ups
    const history = isFollowUp ? (this.conversationCache.get(notebookId) ?? []) : [];

    const requestPayload = this.buildQueryPayload(notebookId, question, history);

    const url = `${QUERY_STREAM_URL}?bl=boq_assistant-bard-web-server_20250203.16_p0&_reqid=${reqid}&rt=c`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'Cookie': cookieHeader,
          'Origin': BASE_URL,
          'Referer': `${BASE_URL}/`,
        },
        body: `f.req=${encodeURIComponent(requestPayload)}&at=${encodeURIComponent(csrf)}&`,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        throw new AuthError('Authentication failed. Run setup_auth to re-authenticate.');
      }

      if (!response.ok) {
        throw new ValidationError(`Query failed with status ${response.status}`);
      }

      const text = await response.text();
      const result = this.parseQueryResponse(text);

      // Update conversation cache for follow-ups
      if (result.conversationContext) {
        this.conversationCache.set(notebookId, result.conversationContext);
      }

      // Sanitize the response
      const sanitized = sanitizeResponse(result.answer);

      return {
        answer: sanitized.clean,
        warnings: sanitized.warnings,
        sources: result.sources,
      };
    } catch (error) {
      if (error instanceof AuthError || error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(`Query timed out after ${QUERY_TIMEOUT}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Clear conversation cache for a notebook.
   */
  clearConversation(notebookId: string): void {
    this.conversationCache.delete(notebookId);
  }

  /**
   * Clear all conversation caches.
   */
  clearAllConversations(): void {
    this.conversationCache.clear();
  }

  private async getCsrfToken(cookies: CookieData[]): Promise<string> {
    if (this.csrfToken && Date.now() < this.csrfTokenExpiry) {
      return this.csrfToken;
    }

    const cookieHeader = this.buildCookieHeader(cookies);

    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers: { 'Cookie': cookieHeader },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new AuthError(`Failed to fetch CSRF token: HTTP ${response.status}`);
    }

    const html = await response.text();
    const match = CSRF_REGEX.exec(html);
    if (!match) {
      throw new AuthError('CSRF token not found. Authentication may have expired. Run setup_auth.');
    }

    this.csrfToken = match[1];
    this.csrfTokenExpiry = Date.now() + 5 * 60 * 1000;
    return this.csrfToken;
  }

  private getNextReqId(): number {
    const id = this.reqidCounter;
    this.reqidCounter += 100000;
    return id;
  }

  private buildQueryPayload(
    notebookId: string,
    question: string,
    history: unknown[],
  ): string {
    // Build the query request structure
    // Format: [question, notebookId, conversationHistory, null, null, null, null, 1]
    const payload = [
      [question, notebookId, history.length > 0 ? history : null, null, null, null, null, 1],
    ];
    return JSON.stringify(payload);
  }

  private parseQueryResponse(text: string): {
    answer: string;
    sources: string[];
    conversationContext: unknown[] | null;
  } {
    const stripped = stripAntiXssi(text);
    const parts: string[] = [];
    const sources: string[] = [];
    let conversationContext: unknown[] | null = null;

    // Parse chunked streaming response
    const lines = stripped.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      // Try to parse byte count
      const byteCount = parseInt(line, 10);
      if (!isNaN(byteCount) && byteCount > 0) {
        // Next content is the JSON data
        i++;
        let jsonStr = '';
        while (i < lines.length && jsonStr.length < byteCount) {
          jsonStr += lines[i] + '\n';
          i++;
        }
        try {
          const parsed = JSON.parse(jsonStr.trim());
          this.extractQueryData(parsed, parts, sources, (ctx) => {
            conversationContext = ctx;
          });
        } catch {
          // Skip unparseable chunks
        }
      } else {
        // Try parsing line as JSON directly
        try {
          const parsed = JSON.parse(line);
          if (Array.isArray(parsed)) {
            this.extractQueryData(parsed, parts, sources, (ctx) => {
              conversationContext = ctx;
            });
          }
        } catch {
          // Skip non-JSON lines
        }
        i++;
      }
    }

    return {
      answer: parts.join('') || 'No response received.',
      sources,
      conversationContext,
    };
  }

  private extractQueryData(
    data: unknown[],
    parts: string[],
    sources: string[],
    setContext: (ctx: unknown[]) => void,
  ): void {
    // Navigate the response structure to find text content and sources
    // The structure varies but generally text is in nested arrays
    try {
      // Look for wrb.fr envelope first
      for (const item of data) {
        if (!Array.isArray(item)) continue;

        if (item[0] === 'wrb.fr') {
          const resultStr = item[2];
          if (typeof resultStr === 'string') {
            try {
              const result = JSON.parse(resultStr);
              this.extractFromResult(result, parts, sources, setContext);
            } catch {
              // Not JSON, use as-is if it's text content
            }
          }
          continue;
        }

        // Recursively check nested arrays
        if (Array.isArray(item[0])) {
          this.extractQueryData(item, parts, sources, setContext);
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  private extractFromResult(
    result: unknown,
    parts: string[],
    sources: string[],
    setContext: (ctx: unknown[]) => void,
  ): void {
    if (!Array.isArray(result)) return;

    // Extract text content (typically in first few elements)
    for (const item of result) {
      if (typeof item === 'string' && item.length > 0) {
        parts.push(item);
      }
      if (Array.isArray(item)) {
        // Check for source references
        for (const sub of item) {
          if (Array.isArray(sub)) {
            // Source reference structure: [sourceId, title, ...]
            if (typeof sub[0] === 'string' && typeof sub[1] === 'string') {
              if (!sources.includes(sub[1])) {
                sources.push(sub[1]);
              }
            }
          }
        }
        // Conversation context is usually deeper in the structure
        if (item.length > 3 && Array.isArray(item[0])) {
          setContext(item);
        }
      }
    }
  }

  private buildCookieHeader(cookies: CookieData[]): string {
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
  }
}
