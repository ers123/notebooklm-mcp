import { withErrorHandling, toolJsonResponse } from '../index.js';
import { AskFollowupSchema } from '../schemas.js';
import { SessionManager } from '../../session/session-manager.js';
import type { ToolResponse } from '../../types.js';

export function createAskFollowupHandler(sessionManager: SessionManager) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { sessionId, question } = AskFollowupSchema.parse(args);

    const session = sessionManager.getSession(sessionId);
    const result = await session.askFollowup(question);

    return toolJsonResponse({
      answer: result.answer,
      sessionId: result.sessionId,
      ...(result.warnings.length > 0 && { warnings: result.warnings }),
    });
  });
}
