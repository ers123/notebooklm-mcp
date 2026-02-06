import { withErrorHandling, toolJsonResponse } from '../index.js';
import { AskQuestionSchema } from '../schemas.js';
import { SessionManager } from '../../session/session-manager.js';
import type { ToolResponse } from '../../types.js';

export function createAskQuestionHandler(sessionManager: SessionManager) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, question } = AskQuestionSchema.parse(args);

    const session = await sessionManager.createSession(notebookId);
    const result = await session.askQuestion(question);

    return toolJsonResponse({
      answer: result.answer,
      sessionId: result.sessionId,
      ...(result.warnings.length > 0 && { warnings: result.warnings }),
    });
  });
}
