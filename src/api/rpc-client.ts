import { CookieStore } from '../auth/cookie-store.js';
import { BATCHEXECUTE_URL, RPC_TIMEOUT } from '../config.js';
import { AuthError, TimeoutError, ValidationError } from '../errors.js';
import { parseRpcResponse } from './response-parser.js';
import { AuthHeaders } from './auth-headers.js';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 2;

export class RpcClient {
  private authHeaders: AuthHeaders;

  constructor(cookieStore: CookieStore) {
    this.authHeaders = new AuthHeaders(cookieStore);
  }

  /**
   * Call a NotebookLM RPC via the batchexecute endpoint.
   */
  async callRpc(
    rpcId: string,
    params: unknown[],
    sourcePath?: string,
    timeout?: number,
  ): Promise<unknown> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const csrf = await this.authHeaders.getCsrfToken();
        const headers = await this.authHeaders.getHeaders();

        const body = this.buildRequestBody(rpcId, params, csrf);
        const url = sourcePath
          ? `${BATCHEXECUTE_URL}?source-path=${encodeURIComponent(sourcePath)}`
          : BATCHEXECUTE_URL;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout ?? RPC_TIMEOUT);

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal,
          });

          clearTimeout(timer);

          if (response.status === 401 || response.status === 403) {
            this.authHeaders.invalidateCsrf();
            if (attempt < MAX_RETRIES) {
              logger.warn(`Auth error (${response.status}), retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`);
              continue;
            }
            throw new AuthError('Authentication failed. Run setup_auth to re-authenticate.');
          }

          if (!response.ok) {
            const text = await response.text().catch(() => '');
            logger.error(`RPC ${rpcId} failed: HTTP ${response.status}, body: ${text.slice(0, 200)}`);
            throw new ValidationError(`RPC call failed with status ${response.status}`);
          }

          const text = await response.text();
          return parseRpcResponse(text, rpcId);
        } finally {
          clearTimeout(timer);
        }
      } catch (error) {
        if (error instanceof AuthError || error instanceof ValidationError) {
          lastError = error;
          if (error instanceof AuthError && attempt < MAX_RETRIES) continue;
          throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw new TimeoutError(`RPC call ${rpcId} timed out after ${timeout ?? RPC_TIMEOUT}ms`);
        }
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES) {
          logger.warn(`RPC error, retrying... (attempt ${attempt + 1}/${MAX_RETRIES}): ${lastError.message}`);
          continue;
        }
      }
    }

    throw lastError ?? new Error('RPC call failed after retries');
  }

  /**
   * Build the batchexecute request body.
   */
  private buildRequestBody(rpcId: string, params: unknown[], csrfToken: string): string {
    const paramsJson = JSON.stringify(params);
    const envelope = JSON.stringify([[[rpcId, paramsJson, null, 'generic']]]);
    return `f.req=${encodeURIComponent(envelope)}&at=${encodeURIComponent(csrfToken)}&`;
  }

  /**
   * Invalidate the cached CSRF token.
   */
  invalidateCsrf(): void {
    this.authHeaders.invalidateCsrf();
  }
}
