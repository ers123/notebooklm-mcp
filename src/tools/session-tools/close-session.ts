import { withErrorHandling, toolResponse } from '../index.js';
import { CloseSessionSchema } from '../schemas.js';
import { SessionManager } from '../../session/session-manager.js';
import type { ToolResponse } from '../../types.js';

export function createCloseSessionHandler(sessionManager: SessionManager) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { sessionId } = CloseSessionSchema.parse(args);
    await sessionManager.closeSession(sessionId);
    return toolResponse(`Session ${sessionId} closed successfully.`);
  });
}
