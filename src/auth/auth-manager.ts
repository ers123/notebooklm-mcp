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

  async login(launchBrowser: () => Promise<{ context: { cookies: () => Promise<CookieData[]>; close: () => Promise<void> }; page: { goto: (url: string) => Promise<void>; waitForURL: (pattern: string | RegExp, options?: { timeout?: number }) => Promise<void>; url: () => string } }>): Promise<void> {
    logger.info('Starting manual login flow — opening browser for user authentication');

    const { context, page } = await launchBrowser();

    try {
      // Navigate to NotebookLM — Google will redirect to sign-in if needed
      await page.goto(BASE_URL);

      logger.info('Waiting for user to complete Google sign-in...');
      logger.info('Please sign in to your Google account in the browser window');

      // Wait for successful navigation to NotebookLM (indicates login completed)
      // Timeout of 5 minutes to give user time to complete login
      await page.waitForURL(/notebooklm\.google\.com/, { timeout: 5 * 60 * 1000 });

      logger.info('Login detected — capturing cookies');

      // Extract cookies
      const allCookies = await context.cookies() as CookieData[];

      // Filter and save
      await this.cookieStore.saveCookies(allCookies);

      logger.info('Authentication successful — cookies encrypted and stored');
    } catch (error) {
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
}
