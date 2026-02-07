import { CookieStore } from '../auth/cookie-store.js';
import { AuthManager } from '../auth/auth-manager.js';
import { BASE_URL, RPC_TIMEOUT, BATCHEXECUTE_URL } from '../config.js';
import { AuthError, TimeoutError, ValidationError } from '../errors.js';
import { parseRpcResponse } from './response-parser.js';
import { logger } from '../utils/logger.js';
import type { CookieData } from '../types.js';

const CSRF_REGEX = /SNlM0e":"([^"]+)"/;
const MAX_RETRIES = 2;

export class RpcClient {
  private cookieStore: CookieStore;
  private csrfToken: string | null = null;
  private csrfTokenExpiry: number = 0;

  constructor(cookieStore: CookieStore) {
    this.cookieStore = cookieStore;
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
        const csrf = await this.getCsrfToken();
        const cookies = await this.cookieStore.loadCookies();
        const cookieHeader = this.buildCookieHeader(cookies);

        const body = this.buildRequestBody(rpcId, params, csrf);
        const url = sourcePath
          ? `${BATCHEXECUTE_URL}?source-path=${encodeURIComponent(sourcePath)}`
          : BATCHEXECUTE_URL;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout ?? RPC_TIMEOUT);

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
              'Cookie': cookieHeader,
              'Origin': BASE_URL,
              'Referer': `${BASE_URL}/`,
            },
            body,
            signal: controller.signal,
          });

          clearTimeout(timer);

          if (response.status === 401 || response.status === 403) {
            // Invalidate CSRF token and retry
            this.csrfToken = null;
            this.csrfTokenExpiry = 0;
            if (attempt < MAX_RETRIES) {
              logger.warn(`Auth error (${response.status}), retrying... (attempt ${attempt + 1}/${MAX_RETRIES})`);
              continue;
            }
            throw new AuthError('Authentication failed. Run setup_auth to re-authenticate.');
          }

          if (!response.ok) {
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
   * Get or refresh the CSRF token.
   */
  private async getCsrfToken(): Promise<string> {
    // Return cached token if still valid (5 min cache)
    if (this.csrfToken && Date.now() < this.csrfTokenExpiry) {
      return this.csrfToken;
    }

    const cookies = await this.cookieStore.loadCookies();
    if (cookies.length === 0) {
      throw new AuthError('No cookies available. Run setup_auth to authenticate.');
    }

    const cookieHeader = this.buildCookieHeader(cookies);

    logger.info('Fetching CSRF token...');

    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new AuthError(`Failed to fetch CSRF token: HTTP ${response.status}`);
    }

    const html = await response.text();
    const match = CSRF_REGEX.exec(html);
    if (!match) {
      throw new AuthError('CSRF token not found in page. Authentication may have expired. Run setup_auth.');
    }

    this.csrfToken = match[1];
    this.csrfTokenExpiry = Date.now() + 5 * 60 * 1000; // Cache for 5 minutes
    logger.info('CSRF token acquired');

    return this.csrfToken;
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
   * Build Cookie header from cookie data.
   */
  private buildCookieHeader(cookies: CookieData[]): string {
    return cookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
  }

  /**
   * Invalidate the cached CSRF token.
   */
  invalidateCsrf(): void {
    this.csrfToken = null;
    this.csrfTokenExpiry = 0;
  }
}
