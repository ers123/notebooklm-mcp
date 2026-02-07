import { CookieStore } from '../auth/cookie-store.js';
import { QUERY_STREAM_URL, QUERY_TIMEOUT } from '../config.js';
import { AuthError, TimeoutError, ValidationError } from '../errors.js';
import { stripAntiXssi } from './response-parser.js';
import { AuthHeaders } from './auth-headers.js';
import { logger } from '../utils/logger.js';
import { sanitizeResponse } from '../security/response-sanitizer.js';
import type { QueryStreamResult } from '../types.js';

// Build label — must match batchexecute
const BUILD_LABEL = 'boq_labs-tailwind-frontend_20260108.06_p0';

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
   * @param sourceIds - Source IDs within the notebook
   * @param question - The question to ask
   * @param notebookId - Used for conversation cache key
   * @param isFollowUp - Whether this is a follow-up question
   */
  async query(
    sourceIds: string[],
    question: string,
    notebookId: string,
    isFollowUp: boolean = false,
  ): Promise<QueryStreamResult> {
    const csrf = await this.authHeaders.getCsrfToken();
    const sessionId = this.authHeaders.getSessionId();
    const headers = await this.authHeaders.getHeaders();
    const reqid = this.getNextReqId();

    // Build conversation history for follow-ups
    const history = isFollowUp ? (this.conversationCache.get(notebookId) ?? []) : [];

    const requestPayload = this.buildQueryPayload(sourceIds, question, history.length > 0 ? history : null);

    const queryParams = new URLSearchParams({
      'bl': BUILD_LABEL,
      'hl': 'en',
      '_reqid': String(reqid),
      'rt': 'c',
    });
    if (sessionId) {
      queryParams.set('f.sid', sessionId);
    }
    const url = `${QUERY_STREAM_URL}?${queryParams.toString()}`;

    // Query uses [null, paramsJson] envelope (different from batchexecute)
    const fReq = JSON.stringify([null, requestPayload]);
    const body = `f.req=${encodeURIComponent(fReq)}&at=${encodeURIComponent(csrf)}&`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

    try {
      logger.info(`Query request: ${sourceIds.length} sources, question length ${question.length}`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 401 || response.status === 403) {
        this.authHeaders.invalidateCsrf();
        throw new AuthError('Authentication failed. Run setup_auth to re-authenticate.');
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        logger.error(`Query failed: HTTP ${response.status}, body: ${text.slice(0, 300)}`);
        throw new ValidationError(`Query failed with status ${response.status}`);
      }

      const text = await response.text();
      logger.info(`Query response: ${text.length} bytes`);
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

  /**
   * Build query payload.
   * Format: [sourcesArray, questionText, conversationHistory, [2, null, [1]], conversationId]
   * Sources format: [[[sid1]], [[sid2]], ...]
   */
  private buildQueryPayload(
    sourceIds: string[],
    question: string,
    history: unknown[] | null,
  ): string {
    // Sources: [[[sid]]] per source ID
    const sourcesArray = sourceIds.map(sid => [[sid]]);

    const params = [
      sourcesArray,
      question,
      history,
      [2, null, [1]],
      null, // conversation_id (null for new conversations)
    ];
    return JSON.stringify(params);
  }

  private parseQueryResponse(text: string): {
    answer: string;
    sources: string[];
    conversationContext: unknown[] | null;
  } {
    const stripped = stripAntiXssi(text);
    const answerChunks: { text: string; type: number; length: number }[] = [];
    const sources: string[] = [];
    let conversationContext: unknown[] | null = null;

    // Parse chunked streaming response line by line
    const lines = stripped.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) { i++; continue; }

      const byteCount = parseInt(line, 10);
      if (!isNaN(byteCount) && String(byteCount) === line) {
        // Next line is JSON data
        i++;
        if (i < lines.length) {
          try {
            const parsed = JSON.parse(lines[i]);
            if (Array.isArray(parsed)) {
              this.extractQueryData(parsed, answerChunks, sources, (ctx) => {
                conversationContext = ctx;
              });
            }
          } catch {
            // Skip unparseable
          }
        }
        i++;
      } else {
        try {
          const parsed = JSON.parse(line);
          if (Array.isArray(parsed)) {
            this.extractQueryData(parsed, answerChunks, sources, (ctx) => {
              conversationContext = ctx;
            });
          }
        } catch {
          // Skip non-JSON
        }
        i++;
      }
    }

    // Find longest answer chunk (type 1 = actual answer)
    const answers = answerChunks.filter(c => c.type === 1);
    const best = answers.length > 0
      ? answers.reduce((a, b) => a.length > b.length ? a : b)
      : answerChunks.reduce((a, b) => a.length > b.length ? a : b, { text: '', type: 0, length: 0 });

    return {
      answer: best.text || 'No response received.',
      sources,
      conversationContext,
    };
  }

  private extractQueryData(
    data: unknown[],
    answerChunks: { text: string; type: number; length: number }[],
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
              this.extractFromResult(result, answerChunks, sources, setContext);
            } catch {
              // Not JSON
            }
          }
          continue;
        }

        if (Array.isArray(item[0])) {
          this.extractQueryData(item, answerChunks, sources, setContext);
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  private extractFromResult(
    result: unknown,
    answerChunks: { text: string; type: number; length: number }[],
    sources: string[],
    setContext: (ctx: unknown[]) => void,
  ): void {
    if (!Array.isArray(result)) return;

    const firstElem = result[0];
    if (Array.isArray(firstElem)) {
      // Extract answer text from first element
      const answerText = firstElem[0];
      if (typeof answerText === 'string' && answerText.length > 0) {
        // Detect type: firstElem[4][-1] === 1 means answer, 2 means thinking
        let chunkType = 1; // default to answer
        if (Array.isArray(firstElem[4]) && firstElem[4].length > 0) {
          const lastVal = firstElem[4][firstElem[4].length - 1];
          if (typeof lastVal === 'number') {
            chunkType = lastVal;
          }
        }
        answerChunks.push({ text: answerText, type: chunkType, length: answerText.length });
      }
    } else if (typeof firstElem === 'string' && firstElem.length > 0) {
      answerChunks.push({ text: firstElem, type: 1, length: firstElem.length });
    }

    // Extract sources
    for (const item of result) {
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
        // Conversation context
        if (item.length > 3 && Array.isArray(item[0])) {
          setContext(item);
        }
      }
    }
  }
}
