import { createHash } from 'node:crypto';
import { CookieStore } from '../auth/cookie-store.js';
import { BASE_URL } from '../config.js';
import { AuthError } from '../errors.js';
import { logger } from '../utils/logger.js';
import type { CookieData } from '../types.js';

const CSRF_PATTERNS = [
  /SNlM0e":"([^"]+)"/,
  /SNlM0e\\x22:\\x22([^\\]+)\\x22/,
  /"SNlM0e"\s*:\s*"([^"]+)"/,
];

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/**
 * Shared authentication header manager for Google API requests.
 * Handles CSRF token extraction, SAPISIDHASH computation, and cookie headers.
 */
export class AuthHeaders {
  private cookieStore: CookieStore;
  private csrfToken: string | null = null;
  private csrfTokenExpiry: number = 0;

  constructor(cookieStore: CookieStore) {
    this.cookieStore = cookieStore;
  }

  /**
   * Get all required headers for a Google API request.
   */
  async getHeaders(cookies?: CookieData[]): Promise<Record<string, string>> {
    const loadedCookies = cookies ?? await this.cookieStore.loadCookies();
    if (loadedCookies.length === 0) {
      throw new AuthError('No cookies available. Run setup_auth to authenticate.');
    }

    const cookieHeader = this.buildCookieHeader(loadedCookies);
    const sapisidHash = this.computeSapisidHash(loadedCookies);

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'Cookie': cookieHeader,
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/`,
      'User-Agent': USER_AGENT,
    };

    if (sapisidHash) {
      headers['Authorization'] = `SAPISIDHASH ${sapisidHash}`;
    }

    return headers;
  }

  /**
   * Get or refresh the CSRF token.
   */
  async getCsrfToken(): Promise<string> {
    if (this.csrfToken && Date.now() < this.csrfTokenExpiry) {
      return this.csrfToken;
    }

    const cookies = await this.cookieStore.loadCookies();
    if (cookies.length === 0) {
      throw new AuthError('No cookies available. Run setup_auth to authenticate.');
    }

    const cookieHeader = this.buildCookieHeader(cookies);

    logger.info('Fetching CSRF token...');

    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': USER_AGENT,
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      const status = response.status;
      logger.error(`CSRF fetch failed: HTTP ${status}`);
      throw new AuthError(
        `Failed to fetch CSRF token: HTTP ${status}. ` +
        (status === 302 || status === 303
          ? 'Redirected — cookies may have expired. Run setup_auth.'
          : 'Run setup_auth to re-authenticate.')
      );
    }

    const html = await response.text();

    // Try multiple regex patterns
    for (const pattern of CSRF_PATTERNS) {
      const match = pattern.exec(html);
      if (match?.[1]) {
        this.csrfToken = match[1];
        this.csrfTokenExpiry = Date.now() + 5 * 60 * 1000;
        logger.info('CSRF token acquired');
        return this.csrfToken;
      }
    }

    // Debug: log what we got
    const hasWizData = html.includes('WIZ_global_data');
    const hasSnlm = html.includes('SNlM0e');
    const pageLength = html.length;
    logger.error(`CSRF token not found. Page length: ${pageLength}, hasWIZ: ${hasWizData}, hasSNlM0e: ${hasSnlm}`);

    if (pageLength < 1000) {
      logger.error('Page too short — likely a redirect/login page');
    }

    throw new AuthError(
      'CSRF token not found in page. Authentication may have expired. Run setup_auth.'
    );
  }

  /**
   * Invalidate the cached CSRF token.
   */
  invalidateCsrf(): void {
    this.csrfToken = null;
    this.csrfTokenExpiry = 0;
  }

  /**
   * Compute SAPISIDHASH for Google API authentication.
   * Format: {timestamp}_{SHA1(timestamp + " " + SAPISID + " " + origin)}
   */
  private computeSapisidHash(cookies: CookieData[]): string | null {
    // Look for SAPISID or __Secure-3PAPISID cookie
    const sapisid = cookies.find(c => c.name === 'SAPISID')
      ?? cookies.find(c => c.name === '__Secure-3PAPISID')
      ?? cookies.find(c => c.name === '__Secure-1PAPISID');

    if (!sapisid) {
      logger.warn('SAPISID cookie not found — SAPISIDHASH header will be omitted');
      return null;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const input = `${timestamp} ${sapisid.value} ${BASE_URL}`;
    const hash = createHash('sha1').update(input).digest('hex');

    return `${timestamp}_${hash}`;
  }

  /**
   * Build Cookie header string from cookie data.
   */
  private buildCookieHeader(cookies: CookieData[]): string {
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
  }
}
