import { withErrorHandling, toolJsonResponse } from '../index.js';
import { GenerateSummarySchema } from '../schemas.js';
import { SessionManager } from '../../session/session-manager.js';
import type { ToolResponse } from '../../types.js';

export function createGenerateSummaryHandler(sessionManager: SessionManager) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId } = GenerateSummarySchema.parse(args);

    const session = await sessionManager.createSession(notebookId);
    const result = await session.getSummary();

    return toolJsonResponse({
      summary: result.summary,
      sourceCount: result.sourceCount,
      ...(result.warnings.length > 0 && { warnings: result.warnings }),
    });
  });
}
