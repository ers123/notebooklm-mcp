import { withErrorHandling, toolResponse } from '../index.js';
import { AuthManager } from '../../auth/auth-manager.js';
import { BrowserLauncher } from '../../browser/browser-launcher.js';
import type { CookieData, ToolResponse } from '../../types.js';

// Google domains whose cookies are needed for API authentication
const COOKIE_URLS = [
  'https://google.com',
  'https://www.google.com',
  'https://accounts.google.com',
  'https://notebooklm.google.com',
  'https://myaccount.google.com',
];

export function createSetupAuthHandler(authManager: AuthManager, browserLauncher: BrowserLauncher) {
  return withErrorHandling(async (_args: Record<string, unknown>): Promise<ToolResponse> => {
    await authManager.login(async () => {
      const browser = await browserLauncher.launch({ headless: false });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
      });
      const page = await context.newPage();

      return {
        context: {
          cookies: async () => {
            // Pass explicit URLs to capture cookies across all Google domains
            const cookies = await context.cookies(COOKIE_URLS);
            return cookies.map(c => ({
              name: c.name,
              value: c.value,
              domain: c.domain,
              path: c.path,
              expires: c.expires,
              httpOnly: c.httpOnly,
              secure: c.secure,
              sameSite: (c.sameSite || 'Lax') as 'Strict' | 'Lax' | 'None',
            })) as CookieData[];
          },
          close: () => context.close(),
        },
        page: {
          goto: (url: string) => page.goto(url).then(() => {}),
          waitForURL: (pattern: string | RegExp, options?: { timeout?: number }) =>
            page.waitForURL(pattern, options).then(() => {}),
          waitForLoadState: (state: string) =>
            page.waitForLoadState(state as 'load' | 'domcontentloaded' | 'networkidle').then(() => {}),
          url: () => page.url(),
        },
      };
    });

    return toolResponse('Authentication successful. You are now logged in to NotebookLM.');
  });
}
