import { AuthError, ValidationError } from '../errors.js';
import { logger } from '../utils/logger.js';

/**
 * Strip the anti-XSSI prefix from Google API responses.
 * Google prepends )]}\' to JSON responses to prevent XSSI attacks.
 */
export function stripAntiXssi(text: string): string {
  const trimmed = text.trimStart();
  if (trimmed.startsWith(")]}'")) {
    return trimmed.slice(4).trimStart();
  }
  return trimmed;
}

/**
 * Parse a chunked batchexecute response into individual JSON chunks.
 *
 * Google's batchexecute format: each chunk starts with a byte count on its own
 * line, followed by JSON data. For small responses the JSON fits on one line;
 * for large responses (notebook details, etc.) the JSON can span multiple lines.
 *
 * Strategy: when we see a byte count, try parsing the next line as JSON.
 * If that fails, keep accumulating subsequent lines until JSON.parse succeeds.
 */
export function parseChunkedResponse(text: string): unknown[][] {
  const stripped = stripAntiXssi(text);
  const lines = stripped.split('\n');
  const chunks: unknown[][] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // Check if line is a byte count (integer)
    const byteCount = parseInt(line, 10);
    if (!isNaN(byteCount) && String(byteCount) === line && byteCount > 0) {
      // Byte count line — accumulate following lines until JSON.parse succeeds
      i++;
      let accumulated = '';
      let found = false;

      while (i < lines.length) {
        accumulated += (accumulated ? '\n' : '') + lines[i];
        i++;

        try {
          const data = JSON.parse(accumulated);
          if (Array.isArray(data)) {
            chunks.push(data);
          }
          found = true;
          break;
        } catch {
          // JSON incomplete — keep accumulating more lines
        }
      }

      if (!found && accumulated.trim()) {
        logger.warn(`Failed to parse chunk after byte count ${byteCount}, accumulated ${accumulated.length} chars`);
      }
    } else {
      // Not a byte count — try parsing line directly as JSON
      try {
        const data = JSON.parse(line);
        if (Array.isArray(data)) {
          chunks.push(data);
        }
      } catch {
        // Skip non-JSON lines
      }
      i++;
    }
  }

  return chunks;
}

/**
 * Extract the RPC result from parsed batchexecute chunks.
 * Looks for wrb.fr envelope containing the specified RPC ID.
 */
export function extractRpcResult(chunks: unknown[][], rpcId: string): unknown {
  // Log all found rpcIds for debugging
  const foundIds: string[] = [];
  for (const chunk of chunks) {
    for (const envelope of chunk) {
      if (Array.isArray(envelope) && envelope[0] === 'wrb.fr' && typeof envelope[1] === 'string') {
        foundIds.push(envelope[1]);
      }
    }
  }
  logger.info(`extractRpcResult: looking for "${rpcId}", found envelopes: [${foundIds.join(', ')}]`);

  for (const chunk of chunks) {
    // Each chunk is an array of envelopes
    for (const envelope of chunk) {
      if (!Array.isArray(envelope)) continue;

      // wrb.fr structure: ["wrb.fr", rpcId, resultJson, ...]
      if (envelope[0] === 'wrb.fr' && envelope[1] === rpcId) {
        // Check for auth error (error code 16 at position 5)
        if (
          envelope.length > 6 &&
          envelope[6] === 'generic' &&
          Array.isArray(envelope[5]) &&
          (envelope[5] as number[]).includes(16)
        ) {
          throw new AuthError('Authentication rejected by API. Run setup_auth to re-authenticate.');
        }

        const resultJson = envelope[2];
        if (typeof resultJson === 'string') {
          try {
            return JSON.parse(resultJson);
          } catch {
            return resultJson;
          }
        }
        return resultJson;
      }
    }
  }

  return null;
}

/**
 * Get debug info from parsed chunks — found rpcIds, chunk count, etc.
 */
export function getChunkDebugInfo(responseText: string): {
  chunkCount: number;
  foundRpcIds: string[];
  responseLength: number;
  firstChunkPreview: string;
} {
  const chunks = parseChunkedResponse(responseText);
  const foundRpcIds: string[] = [];

  for (const chunk of chunks) {
    for (const envelope of chunk) {
      if (Array.isArray(envelope) && envelope[0] === 'wrb.fr' && typeof envelope[1] === 'string') {
        foundRpcIds.push(envelope[1]);
      }
    }
  }

  let firstChunkPreview = '';
  if (chunks.length > 0) {
    firstChunkPreview = JSON.stringify(chunks[0]).slice(0, 300);
  }

  return {
    chunkCount: chunks.length,
    foundRpcIds,
    responseLength: responseText.length,
    firstChunkPreview,
  };
}

/**
 * Parse a batchexecute response and extract the result for a specific RPC.
 * Combines stripAntiXssi + parseChunkedResponse + extractRpcResult.
 */
export function parseRpcResponse(responseText: string, rpcId: string): unknown {
  const chunks = parseChunkedResponse(responseText);

  if (chunks.length === 0) {
    // Log raw response for debugging
    const preview = responseText.slice(0, 300);
    logger.error(`Response parser: 0 chunks parsed from ${responseText.length} bytes. Preview: ${preview}`);
    throw new ValidationError('Empty or unparseable response from API');
  }

  logger.info(`Response parser: ${chunks.length} chunk(s) parsed for RPC ${rpcId}`);
  return extractRpcResult(chunks, rpcId);
}

/**
 * Parse streaming response from GenerateFreeFormStreamed endpoint.
 * Returns accumulated text from all stream chunks.
 */
export function parseStreamResponse(responseText: string): string {
  const stripped = stripAntiXssi(responseText);
  const parts: string[] = [];

  // Split into individual JSON lines/chunks
  const lines = stripped.split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      // Each line may be a byte count or JSON data
      const parsed = JSON.parse(line);
      if (Array.isArray(parsed)) {
        // Extract text content from the streamed response
        const text = extractStreamText(parsed);
        if (text) parts.push(text);
      }
    } catch {
      // Skip non-JSON lines (byte counts, etc.)
    }
  }

  return parts.join('');
}

/**
 * Extract text content from a parsed streaming response chunk.
 */
function extractStreamText(data: unknown[]): string | null {
  // The streaming response has nested arrays
  // Typical structure: [[text_content, ...], ...]
  try {
    // Navigate the nested structure to find text content
    if (Array.isArray(data) && data.length > 0) {
      // Check various nesting patterns
      const inner = data[0];
      if (Array.isArray(inner)) {
        // Look for string content in common positions
        for (const item of inner) {
          if (typeof item === 'string' && item.length > 0) {
            return item;
          }
          if (Array.isArray(item)) {
            for (const subItem of item) {
              if (typeof subItem === 'string' && subItem.length > 0) {
                return subItem;
              }
            }
          }
        }
      }
      if (typeof inner === 'string') {
        return inner;
      }
    }
  } catch {
    // Graceful fallback
  }
  return null;
}
