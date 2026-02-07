import { CookieStore } from '../auth/cookie-store.js';
import { QUERY_STREAM_URL, QUERY_TIMEOUT } from '../config.js';
import { AuthError, TimeoutError, ValidationError } from '../errors.js';
import { stripAntiXssi } from './response-parser.js';
import { AuthHeaders } from './auth-headers.js';
import { logger } from '../utils/logger.js';
import { sanitizeResponse } from '../security/response-sanitizer.js';
import type { QueryStreamResult } from '../types.js';

export class QueryClient {
  private authHeaders: AuthHeaders;
  private reqidCounter: number = 100000;

  // Cache conversation history per notebook for follow-up support
  private conversationCache: Map<string, unknown[]> = new Map();

  constructor(cookieStore: CookieStore) {
    this.authHeaders = new AuthHeaders(cookieStore);
  }

  /**
   * Send a query to a notebook using GenerateFreeFormStreamed.
   */
  async query(
    notebookId: string,
    question: string,
    isFollowUp: boolean = false,
  ): Promise<QueryStreamResult> {
    const csrf = await this.authHeaders.getCsrfToken();
    const headers = await this.authHeaders.getHeaders();
    const reqid = this.getNextReqId();

    // Build conversation history for follow-ups
    const history = isFollowUp ? (this.conversationCache.get(notebookId) ?? []) : [];

    const requestPayload = this.buildQueryPayload(notebookId, question, history);

    const url = `${QUERY_STREAM_URL}?bl=boq_assistant-bard-web-server_20250203.16_p0&_reqid=${reqid}&rt=c`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: `f.req=${encodeURIComponent(requestPayload)}&at=${encodeURIComponent(csrf)}&`,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        this.authHeaders.invalidateCsrf();
        throw new AuthError('Authentication failed. Run setup_auth to re-authenticate.');
      }

      if (!response.ok) {
        throw new ValidationError(`Query failed with status ${response.status}`);
      }

      const text = await response.text();
      const result = this.parseQueryResponse(text);

      // Update conversation cache for follow-ups
      if (result.conversationContext) {
        this.conversationCache.set(notebookId, result.conversationContext);
      }

      // Sanitize the response
      const sanitized = sanitizeResponse(result.answer);

      return {
        answer: sanitized.clean,
        warnings: sanitized.warnings,
        sources: result.sources,
      };
    } catch (error) {
      if (error instanceof AuthError || error instanceof ValidationError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(`Query timed out after ${QUERY_TIMEOUT}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Clear conversation cache for a notebook.
   */
  clearConversation(notebookId: string): void {
    this.conversationCache.delete(notebookId);
  }

  /**
   * Clear all conversation caches.
   */
  clearAllConversations(): void {
    this.conversationCache.clear();
  }

  private getNextReqId(): number {
    const id = this.reqidCounter;
    this.reqidCounter += 100000;
    return id;
  }

  private buildQueryPayload(
    notebookId: string,
    question: string,
    history: unknown[],
  ): string {
    const payload = [
      [question, notebookId, history.length > 0 ? history : null, null, null, null, null, 1],
    ];
    return JSON.stringify(payload);
  }

  private parseQueryResponse(text: string): {
    answer: string;
    sources: string[];
    conversationContext: unknown[] | null;
  } {
    const stripped = stripAntiXssi(text);
    const parts: string[] = [];
    const sources: string[] = [];
    let conversationContext: unknown[] | null = null;

    // Parse chunked streaming response
    const lines = stripped.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      const byteCount = parseInt(line, 10);
      if (!isNaN(byteCount) && byteCount > 0) {
        i++;
        let jsonStr = '';
        while (i < lines.length && jsonStr.length < byteCount) {
          jsonStr += lines[i] + '\n';
          i++;
        }
        try {
          const parsed = JSON.parse(jsonStr.trim());
          this.extractQueryData(parsed, parts, sources, (ctx) => {
            conversationContext = ctx;
          });
        } catch {
          // Skip unparseable chunks
        }
      } else {
        try {
          const parsed = JSON.parse(line);
          if (Array.isArray(parsed)) {
            this.extractQueryData(parsed, parts, sources, (ctx) => {
              conversationContext = ctx;
            });
          }
        } catch {
          // Skip non-JSON lines
        }
        i++;
      }
    }

    return {
      answer: parts.join('') || 'No response received.',
      sources,
      conversationContext,
    };
  }

  private extractQueryData(
    data: unknown[],
    parts: string[],
    sources: string[],
    setContext: (ctx: unknown[]) => void,
  ): void {
    try {
      for (const item of data) {
        if (!Array.isArray(item)) continue;

        if (item[0] === 'wrb.fr') {
          const resultStr = item[2];
          if (typeof resultStr === 'string') {
            try {
              const result = JSON.parse(resultStr);
              this.extractFromResult(result, parts, sources, setContext);
            } catch {
              // Not JSON
            }
          }
          continue;
        }

        if (Array.isArray(item[0])) {
          this.extractQueryData(item, parts, sources, setContext);
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  private extractFromResult(
    result: unknown,
    parts: string[],
    sources: string[],
    setContext: (ctx: unknown[]) => void,
  ): void {
    if (!Array.isArray(result)) return;

    for (const item of result) {
      if (typeof item === 'string' && item.length > 0) {
        parts.push(item);
      }
      if (Array.isArray(item)) {
        for (const sub of item) {
          if (Array.isArray(sub)) {
            if (typeof sub[0] === 'string' && typeof sub[1] === 'string') {
              if (!sources.includes(sub[1])) {
                sources.push(sub[1]);
              }
            }
          }
        }
        if (item.length > 3 && Array.isArray(item[0])) {
          setContext(item);
        }
      }
    }
  }
}
