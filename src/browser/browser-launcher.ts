import { chromium, type Browser, type LaunchOptions } from 'patchright';
import { BLOCKED_BROWSER_ARGS, BROWSER_ARGS } from '../config.js';
import { BrowserError } from '../errors.js';
import { logger } from '../utils/logger.js';

export class BrowserLauncher {
  private browser: Browser | null = null;

  async launch(options?: { headless?: boolean }): Promise<Browser> {
    if (this.browser?.isConnected()) {
      return this.browser;
    }

    const headless = options?.headless ?? true;

    logger.info(`Launching browser (headless: ${headless})`);

    try {
      this.browser = await chromium.launch({
        headless,
        args: [...BROWSER_ARGS],
        // CRITICAL: Block dangerous args that Patchright/Playwright might set
        ignoreDefaultArgs: [...BLOCKED_BROWSER_ARGS],
      });

      this.browser.on('disconnected', () => {
        logger.info('Browser disconnected');
        this.browser = null;
      });

      return this.browser;
    } catch (error) {
      throw new BrowserError(
        'Failed to launch browser. Ensure Chromium is installed (npx patchright install chromium).',
        error instanceof Error ? error : undefined
      );
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // Browser may already be closed
      }
      this.browser = null;
      logger.info('Browser closed');
    }
  }

  isRunning(): boolean {
    return this.browser?.isConnected() ?? false;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }
}
