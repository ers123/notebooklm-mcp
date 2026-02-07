import type { CookieData, AuthState } from '../types.js';
import { CookieStore } from './cookie-store.js';
import { StateValidator } from './state-validator.js';
import { BASE_URL, ALLOWED_COOKIE_DOMAINS } from '../config.js';
import { AuthError } from '../errors.js';
import { logger } from '../utils/logger.js';

export class AuthManager {
  private cookieStore: CookieStore;
  private stateValidator: StateValidator;

  constructor() {
    this.cookieStore = new CookieStore();
    this.stateValidator = new StateValidator();
  }

  async login(launchBrowser: () => Promise<{ context: { cookies: () => Promise<CookieData[]>; close: () => Promise<void> }; page: { goto: (url: string) => Promise<void>; waitForURL: (pattern: string | RegExp, options?: { timeout?: number }) => Promise<void>; waitForLoadState?: (state: string) => Promise<void>; url: () => string } }>): Promise<void> {
    logger.info('Starting manual login flow — opening browser for user authentication');

    const { context, page } = await launchBrowser();

    try {
      // Navigate to NotebookLM — Google will redirect to sign-in if needed
      await page.goto(BASE_URL);

      logger.info('Browser opened. Waiting for user to complete Google sign-in...');
      logger.info('Please sign in to your Google account in the browser window');

      // Instead of relying on URL patterns (which can be fragile with Google's
      // redirects), poll for critical auth cookies every 2 seconds.
      // Google sets SID/SAPISID on .google.com after successful sign-in.
      const CRITICAL_COOKIE_NAMES = ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID',
        '__Secure-1PSID', '__Secure-3PSID', '__Secure-1PAPISID', '__Secure-3PAPISID'];
      const LOGIN_TIMEOUT = 5 * 60 * 1000; // 5 minutes
      const POLL_INTERVAL = 2000; // 2 seconds
      const startTime = Date.now();
      let allCookies: CookieData[] = [];
      let foundCritical: string[] = [];

      while (Date.now() - startTime < LOGIN_TIMEOUT) {
        allCookies = await context.cookies();

        foundCritical = allCookies
          .filter(c => CRITICAL_COOKIE_NAMES.includes(c.name))
          .map(c => c.name);

        if (foundCritical.length >= 2) {
          // Found enough critical cookies — login is complete
          logger.info(`Login detected! Found cookies: ${foundCritical.join(', ')}`);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      }

      if (foundCritical.length < 2) {
        const domains = [...new Set(allCookies.map(c => c.domain))];
        const names = allCookies.map(c => c.name);
        logger.error(`Login timeout. Cookies found: ${names.join(', ')}`);
        logger.error(`Cookie domains: ${domains.join(', ')}`);
        throw new AuthError(
          'Login timed out — no Google session cookies detected after 5 minutes. ' +
          'Please ensure you complete the full Google sign-in in the browser window.'
        );
      }

      // Wait a bit more for any remaining cookies to propagate
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Final cookie capture
      allCookies = await context.cookies();

      const domains = [...new Set(allCookies.map(c => c.domain))];
      logger.info(`Final capture: ${allCookies.length} cookies from domains: ${domains.join(', ')}`);
      logger.info(`Critical cookies: ${foundCritical.join(', ')}`);

      // Filter and save
      await this.cookieStore.saveCookies(allCookies);

      logger.info('Authentication successful — cookies encrypted and stored');
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError(
        'Login failed or timed out. Please try again with setup_auth.',
        error instanceof Error ? error : undefined
      );
    } finally {
      await context.close();
    }
  }

  async logout(): Promise<void> {
    await this.cookieStore.clearCookies();
    logger.info('Logged out — all stored auth data cleared');
  }

  async isAuthenticated(): Promise<AuthState> {
    const hasCookies = await this.cookieStore.hasCookies();
    if (!hasCookies) {
      return { isValid: false, needsRefresh: true };
    }

    try {
      const cookies = await this.cookieStore.loadCookies();
      return this.stateValidator.getAuthState(cookies);
    } catch {
      return { isValid: false, needsRefresh: true };
    }
  }

  async getCookies(): Promise<CookieData[]> {
    return this.cookieStore.loadCookies();
  }

  getCookieStore(): CookieStore {
    return this.cookieStore;
  }
}
