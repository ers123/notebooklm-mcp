import { BaseError, AuthError, BrowserError, SessionError, SecurityError, ValidationError, TimeoutError } from '../errors.js';
import { logger } from '../utils/logger.js';
import type { ToolResponse } from '../types.js';

type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResponse>;

function formatErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return `Validation error: ${error.message}`;
  }
  if (error instanceof AuthError) {
    return `Authentication error: ${error.message}. Run the setup_auth tool to log in.`;
  }
  if (error instanceof BrowserError) {
    return `Browser error: ${error.message}. Try closing sessions and retrying.`;
  }
  if (error instanceof SessionError) {
    return `Session error: ${error.message}`;
  }
  if (error instanceof SecurityError) {
    return `Security error: ${error.message}`;
  }
  if (error instanceof TimeoutError) {
    return `Operation timed out: ${error.message}`;
  }
  if (error instanceof BaseError) {
    return `Error: ${error.message}`;
  }
  if (error instanceof Error) {
    return `Unexpected error: ${error.message}`;
  }
  return 'An unknown error occurred';
}

export function withErrorHandling(handler: ToolHandler): ToolHandler {
  return async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      return await handler(args);
    } catch (error) {
      const message = formatErrorMessage(error);

      logger.error(message, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        code: error instanceof BaseError ? error.code : undefined,
      });

      return {
        content: [{ type: 'text', text: message }],
        isError: true,
      };
    }
  };
}

export function toolResponse(text: string): ToolResponse {
  return {
    content: [{ type: 'text', text }],
  };
}

export function toolJsonResponse(data: unknown): ToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}
