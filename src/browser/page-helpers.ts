import type { Page } from 'patchright';
import { validateUrl } from '../security/url-validator.js';
import { sanitizeResponse } from '../security/response-sanitizer.js';
import { typeDelay, actionDelay } from '../utils/timing.js';
import { NAVIGATION_TIMEOUT } from '../config.js';
import type { SanitizeResult } from '../types.js';
import { TimeoutError } from '../errors.js';

export async function safeGoto(page: Page, url: string): Promise<void> {
  validateUrl(url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT });
}

export async function typeText(page: Page, selector: string, text: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: NAVIGATION_TIMEOUT });
  await page.click(selector);
  await actionDelay();

  for (const char of text) {
    await page.keyboard.type(char);
    await typeDelay();
  }
}

export async function clickElement(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: NAVIGATION_TIMEOUT });
  await actionDelay();
  await page.click(selector);
}

export async function extractText(page: Page, selector: string): Promise<SanitizeResult> {
  await page.waitForSelector(selector, { timeout: NAVIGATION_TIMEOUT });
  const rawText = await page.$eval(selector, (el: Element) => (el as HTMLElement).innerText || el.textContent || '');
  return sanitizeResponse(rawText);
}

export async function waitForSelector(page: Page, selector: string, timeout?: number): Promise<void> {
  try {
    await page.waitForSelector(selector, { timeout: timeout ?? NAVIGATION_TIMEOUT });
  } catch (error) {
    throw new TimeoutError(
      `Timed out waiting for element: ${selector}`,
      error instanceof Error ? error : undefined
    );
  }
}

export async function waitForNavigation(page: Page, urlPattern?: string | RegExp): Promise<void> {
  try {
    if (urlPattern) {
      await page.waitForURL(urlPattern, { timeout: NAVIGATION_TIMEOUT });
    } else {
      await page.waitForLoadState('domcontentloaded', { timeout: NAVIGATION_TIMEOUT });
    }
  } catch (error) {
    throw new TimeoutError(
      'Navigation timed out',
      error instanceof Error ? error : undefined
    );
  }
}
