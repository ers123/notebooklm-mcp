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
      // Navigate directly to Google sign-in with NotebookLM as continue URL.
      // This forces the login flow — the user MUST sign in before being
      // redirected to NotebookLM. Avoids the issue where notebooklm.google.com
      // loads a public page and waitForURL resolves without any login.
      const loginUrl = `https://accounts.google.com/ServiceLogin?continue=${encodeURIComponent(BASE_URL)}`;
      await page.goto(loginUrl);

      logger.info('Waiting for user to complete Google sign-in...');
      logger.info('Please sign in to your Google account in the browser window');

      // Wait for redirect to NotebookLM — only happens AFTER successful Google login
      // Timeout of 5 minutes to give user time to complete login
      await page.waitForURL(/notebooklm\.google\.com/, { timeout: 5 * 60 * 1000 });

      logger.info('Login detected — waiting for page to fully load...');

      // Wait for network to settle so all cookies are set across domains
      if (page.waitForLoadState) {
        await page.waitForLoadState('networkidle');
      }

      // Additional delay for cross-domain cookie propagation
      // Google sets SID/HSID/SAPISID across .google.com during redirect chain
      await new Promise(resolve => setTimeout(resolve, 5000));

      logger.info('Capturing cookies...');

      // Extract cookies
      const allCookies = await context.cookies() as CookieData[];

      // Diagnostic logging before filtering
      const domains = [...new Set(allCookies.map(c => c.domain))];
      logger.info(`Raw cookies captured: ${allCookies.length} from domains: ${domains.join(', ')}`);

      const criticalNames = ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', '__Secure-1PSID', '__Secure-3PSID'];
      const foundCritical = allCookies.filter(c => criticalNames.includes(c.name)).map(c => c.name);
      if (foundCritical.length === 0) {
        logger.error('FAILED: No critical auth cookies captured after login.');
        logger.error(`All cookie names: ${allCookies.map(c => c.name).join(', ')}`);
        logger.error(`All cookie domains: ${domains.join(', ')}`);
        throw new AuthError(
          'Login appeared to succeed but no session cookies were captured. ' +
          'Please ensure you fully completed the Google sign-in (not just loaded the page). ' +
          'Try running setup_auth again.'
        );
      }
      logger.info(`Critical auth cookies found: ${foundCritical.join(', ')}`);

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

  getCookieStore(): CookieStore {
    return this.cookieStore;
  }
}
