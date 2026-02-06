import { NotebookSession } from './notebook-session.js';
import { ContextManager } from '../browser/context-manager.js';
import { MAX_SESSIONS, SESSION_IDLE_TIMEOUT, CLEANUP_INTERVAL } from '../config.js';
import { SessionError } from '../errors.js';
import { logger } from '../utils/logger.js';

export class SessionManager {
  private sessions: Map<string, NotebookSession> = new Map();
  private contextManager: ContextManager;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  startCleanupTimer(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleSessions().catch(err => {
        logger.error('Session cleanup failed', { error: String(err) });
      });
    }, CLEANUP_INTERVAL);
    // Unref so the timer doesn't keep the process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  async createSession(notebookId: string): Promise<NotebookSession> {
    // Check if we already have a session for this notebook
    for (const session of this.sessions.values()) {
      if (session.notebookId === notebookId) {
        logger.info(`Reusing existing session for notebook: ${notebookId}`);
        return session;
      }
    }

    // Enforce max sessions
    if (this.sessions.size >= MAX_SESSIONS) {
      // Try to close the oldest idle session
      const oldestIdle = this.findOldestIdleSession();
      if (oldestIdle) {
        await this.closeSession(oldestIdle.id);
      } else {
        throw new SessionError(
          `Maximum sessions (${MAX_SESSIONS}) reached. Close a session first.`
        );
      }
    }

    const session = new NotebookSession(notebookId);
    const page = await this.contextManager.newPage();
    session.setPage(page);

    // Navigate to the notebook
    await session.navigate();

    this.sessions.set(session.id, session);
    logger.info(`Created session ${session.id} for notebook ${notebookId}`);

    return session;
  }

  getSession(sessionId: string): NotebookSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionError(`Session not found: ${sessionId}`);
    }
    return session;
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionError(`Session not found: ${sessionId}`);
    }
    await session.close();
    this.sessions.delete(sessionId);
    logger.info(`Closed session: ${sessionId}`);
  }

  listSessions(): Array<{ id: string; notebookId: string; lastActivity: number; createdAt: number; idleMs: number }> {
    return Array.from(this.sessions.values()).map(s => ({
      ...s.toInfo(),
      idleMs: Date.now() - s.lastActivity,
    }));
  }

  private findOldestIdleSession(): NotebookSession | null {
    let oldest: NotebookSession | null = null;
    for (const session of this.sessions.values()) {
      if (session.isIdle(SESSION_IDLE_TIMEOUT)) {
        if (!oldest || session.lastActivity < oldest.lastActivity) {
          oldest = session;
        }
      }
    }
    return oldest;
  }

  private async cleanupIdleSessions(): Promise<void> {
    const idleSessions = Array.from(this.sessions.values()).filter(
      s => s.isIdle(SESSION_IDLE_TIMEOUT)
    );

    for (const session of idleSessions) {
      logger.info(`Cleaning up idle session: ${session.id} (notebook: ${session.notebookId})`);
      await session.close();
      this.sessions.delete(session.id);
    }

    if (idleSessions.length > 0) {
      logger.info(`Cleaned up ${idleSessions.length} idle sessions`);
    }
  }

  async closeAll(): Promise<void> {
    this.stopCleanupTimer();
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      try {
        await this.closeSession(id);
      } catch {
        // Best effort cleanup
      }
    }
    logger.info('All sessions closed');
  }

  get sessionCount(): number {
    return this.sessions.size;
  }
}
