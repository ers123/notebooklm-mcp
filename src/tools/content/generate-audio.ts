import { withErrorHandling, toolJsonResponse } from '../index.js';
import { GenerateAudioSchema } from '../schemas.js';
import { SessionManager } from '../../session/session-manager.js';
import type { ToolResponse } from '../../types.js';

export function createGenerateAudioHandler(sessionManager: SessionManager) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId } = GenerateAudioSchema.parse(args);

    const session = await sessionManager.createSession(notebookId);
    const result = await session.generateAudioOverview();

    return toolJsonResponse(result);
  });
}
