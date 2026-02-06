import { withErrorHandling, toolResponse } from '../index.js';
import { AuthManager } from '../../auth/auth-manager.js';
import type { ToolResponse } from '../../types.js';

export function createClearAuthHandler(authManager: AuthManager) {
  return withErrorHandling(async (_args: Record<string, unknown>): Promise<ToolResponse> => {
    await authManager.logout();
    return toolResponse('All authentication data has been cleared. Cookies deleted and encryption key removed from Keychain.');
  });
}
