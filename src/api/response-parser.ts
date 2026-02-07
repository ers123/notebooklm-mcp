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
 * Line-based parser: lines that parse as integers are byte counts (skipped),
 * lines that parse as JSON arrays are data chunks.
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
    if (!isNaN(byteCount) && String(byteCount) === line) {
      // Next line should be JSON data
      i++;
      if (i < lines.length) {
        try {
          const data = JSON.parse(lines[i]);
          if (Array.isArray(data)) {
            chunks.push(data);
          }
        } catch {
          // Skip malformed JSON
        }
      }
      i++;
    } else {
      // Try parsing line directly as JSON
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
