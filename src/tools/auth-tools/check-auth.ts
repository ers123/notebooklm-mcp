import { withErrorHandling, toolJsonResponse } from '../index.js';
import { AuthManager } from '../../auth/auth-manager.js';
import type { ToolResponse } from '../../types.js';

export function createCheckAuthHandler(authManager: AuthManager) {
  return withErrorHandling(async (_args: Record<string, unknown>): Promise<ToolResponse> => {
    const state = await authManager.isAuthenticated();

    return toolJsonResponse({
      authenticated: state.isValid,
      needsRefresh: state.needsRefresh,
      ...(state.expiresAt && {
        expiresAt: new Date(state.expiresAt).toISOString(),
        expiresInMinutes: Math.round((state.expiresAt - Date.now()) / 60000),
      }),
      ...((!state.isValid) && {
        message: 'Not authenticated. Run setup_auth to log in.',
      }),
    });
  });
}
