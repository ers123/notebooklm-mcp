import type { Browser, BrowserContext, Page } from 'patchright';
import { BrowserLauncher } from './browser-launcher.js';
import { CookieStore } from '../auth/cookie-store.js';
import type { CookieData } from '../types.js';
import { BrowserError } from '../errors.js';
import { logger } from '../utils/logger.js';

export class ContextManager {
  private launcher: BrowserLauncher;
  private cookieStore: CookieStore;
  private context: BrowserContext | null = null;

  constructor(launcher: BrowserLauncher, cookieStore: CookieStore) {
    this.launcher = launcher;
    this.cookieStore = cookieStore;
  }

  async getContext(options?: { headless?: boolean }): Promise<BrowserContext> {
    if (this.context) {
      return this.context;
    }

    const browser = await this.launcher.launch(options);
    this.context = await browser.newContext({
      userAgent: undefined, // Use Patchright default (realistic UA)
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
    });

    // Inject stored cookies if available
    try {
      const cookies = await this.cookieStore.loadCookies();
      if (cookies.length > 0) {
        await this.injectCookies(cookies);
        logger.info(`Injected ${cookies.length} stored cookies`);
      }
    } catch {
      logger.warn('No stored cookies to inject');
    }

    return this.context;
  }

  async newPage(options?: { headless?: boolean }): Promise<Page> {
    const context = await this.getContext(options);
    return context.newPage();
  }

  async injectCookies(cookies: CookieData[]): Promise<void> {
    if (!this.context) {
      throw new BrowserError('No browser context available');
    }

    const playwrightCookies = cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires > 0 ? c.expires : undefined,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite as 'Strict' | 'Lax' | 'None',
    }));

    await this.context.addCookies(playwrightCookies);
  }

  async extractCookies(): Promise<CookieData[]> {
    if (!this.context) {
      return [];
    }

    const cookies = await this.context.cookies();
    return cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: (c.sameSite || 'Lax') as 'Strict' | 'Lax' | 'None',
    }));
  }

  async close(): Promise<void> {
    if (this.context) {
      try {
        await this.context.close();
      } catch {
        // Context may already be closed
      }
      this.context = null;
      logger.info('Browser context closed');
    }
  }

  isActive(): boolean {
    return this.context !== null;
  }
}
