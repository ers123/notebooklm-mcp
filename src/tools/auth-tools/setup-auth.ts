import { withErrorHandling, toolResponse } from '../index.js';
import { AuthManager } from '../../auth/auth-manager.js';
import { BrowserLauncher } from '../../browser/browser-launcher.js';
import { CookieStore } from '../../auth/cookie-store.js';
import type { CookieData, ToolResponse } from '../../types.js';

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
            const cookies = await context.cookies();
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
          url: () => page.url(),
        },
      };
    });

    return toolResponse('Authentication successful. You are now logged in to NotebookLM.');
  });
}
