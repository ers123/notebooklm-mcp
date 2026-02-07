import { withErrorHandling, toolJsonResponse } from '../index.js';
import { AuthManager } from '../../auth/auth-manager.js';
import { AuthHeaders } from '../../api/auth-headers.js';
import type { ToolResponse } from '../../types.js';
import { logger } from '../../utils/logger.js';

export function createCheckAuthHandler(authManager: AuthManager) {
  return withErrorHandling(async (_args: Record<string, unknown>): Promise<ToolResponse> => {
    const state = await authManager.isAuthenticated();

    if (!state.isValid) {
      return toolJsonResponse({
        authenticated: false,
        message: 'Not authenticated. Run setup_auth to log in.',
      });
    }

    // Check that critical cookies are present
    const cookies = await authManager.getCookies();
    const cookieNames = cookies.map(c => c.name);
    const hasSapisid = cookieNames.includes('SAPISID') ||
      cookieNames.includes('__Secure-3PAPISID') ||
      cookieNames.includes('__Secure-1PAPISID');
    const hasSid = cookieNames.includes('SID') || cookieNames.includes('__Secure-1PSID');

    if (!hasSapisid || !hasSid) {
      const missing: string[] = [];
      if (!hasSapisid) missing.push('SAPISID');
      if (!hasSid) missing.push('SID');
      return toolJsonResponse({
        authenticated: false,
        message: `Critical cookies missing: ${missing.join(', ')}. Run setup_auth to re-authenticate.`,
        cookieCount: cookies.length,
        cookieNames: cookieNames.slice(0, 20),
      });
    }

    // Try to fetch CSRF token as a live connectivity test
    let csrfOk = false;
    let csrfError: string | undefined;
    try {
      const authHeaders = new AuthHeaders(authManager.getCookieStore());
      await authHeaders.getCsrfToken();
      csrfOk = true;
    } catch (error) {
      csrfError = error instanceof Error ? error.message : String(error);
      logger.warn(`CSRF connectivity test failed: ${csrfError}`);
    }

    return toolJsonResponse({
      authenticated: true,
      apiConnectivity: csrfOk,
      ...(state.expiresAt && {
        expiresAt: new Date(state.expiresAt).toISOString(),
        expiresInMinutes: Math.round((state.expiresAt - Date.now()) / 60000),
      }),
      cookieCount: cookies.length,
      hasSapisid,
      ...(!csrfOk && {
        message: `Cookies present but API connectivity failed: ${csrfError}. Try running setup_auth again.`,
      }),
    });
  });
}
