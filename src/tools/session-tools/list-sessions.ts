import { withErrorHandling, toolJsonResponse } from '../index.js';
import { SessionManager } from '../../session/session-manager.js';
import type { ToolResponse } from '../../types.js';

export function createListSessionsHandler(sessionManager: SessionManager) {
  return withErrorHandling(async (_args: Record<string, unknown>): Promise<ToolResponse> => {
    const sessions = sessionManager.listSessions();

    return toolJsonResponse({
      sessions: sessions.map(s => ({
        id: s.id,
        notebookId: s.notebookId,
        lastActivity: new Date(s.lastActivity).toISOString(),
        createdAt: new Date(s.createdAt).toISOString(),
        idleMinutes: Math.round(s.idleMs / 60000),
      })),
      total: sessions.length,
    });
  });
}
