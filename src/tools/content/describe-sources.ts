import { withErrorHandling, toolJsonResponse } from '../index.js';
import { DescribeSourcesSchema } from '../schemas.js';
import { SessionManager } from '../../session/session-manager.js';
import type { ToolResponse } from '../../types.js';

export function createDescribeSourcesHandler(sessionManager: SessionManager) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId } = DescribeSourcesSchema.parse(args);

    const session = await sessionManager.createSession(notebookId);
    const sources = await session.describeSources();

    return toolJsonResponse({ sources, total: sources.length });
  });
}
