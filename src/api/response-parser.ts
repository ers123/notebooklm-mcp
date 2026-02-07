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
 * line, followed by JSON data that may span MULTIPLE lines. We use the byte
 * count to slice the correct number of bytes from the remaining text.
 */
export function parseChunkedResponse(text: string): unknown[][] {
  const stripped = stripAntiXssi(text);
  const chunks: unknown[][] = [];
  const encoder = new TextEncoder();
  let pos = 0;

  while (pos < stripped.length) {
    // Skip whitespace
    while (pos < stripped.length && /\s/.test(stripped[pos])) pos++;
    if (pos >= stripped.length) break;

    // Read byte count line (ends at newline)
    const newlineIdx = stripped.indexOf('\n', pos);
    if (newlineIdx === -1) break;

    const byteCountStr = stripped.slice(pos, newlineIdx).trim();
    const byteCount = parseInt(byteCountStr, 10);
    if (isNaN(byteCount) || byteCount <= 0) {
      // Not a byte count — try to parse the line itself as JSON
      try {
        const data = JSON.parse(byteCountStr);
        if (Array.isArray(data)) {
          chunks.push(data);
        }
      } catch {
        // Skip
      }
      pos = newlineIdx + 1;
      continue;
    }

    // Move past the byte count line
    pos = newlineIdx + 1;

    // Read exactly byteCount bytes of UTF-8 data.
    // Since JS strings are UTF-16, we accumulate characters until
    // we've consumed byteCount UTF-8 bytes.
    let bytesRead = 0;
    let charEnd = pos;
    while (charEnd < stripped.length && bytesRead < byteCount) {
      const charCode = stripped.codePointAt(charEnd) ?? 0;
      // UTF-8 byte length of this code point
      if (charCode <= 0x7F) bytesRead += 1;
      else if (charCode <= 0x7FF) bytesRead += 2;
      else if (charCode <= 0xFFFF) bytesRead += 3;
      else bytesRead += 4;
      charEnd += charCode > 0xFFFF ? 2 : 1; // surrogate pair for code points > 0xFFFF
    }

    const chunkText = stripped.slice(pos, charEnd);
    pos = charEnd;

    try {
      const parsed = JSON.parse(chunkText);
      if (Array.isArray(parsed)) {
        chunks.push(parsed);
      }
    } catch {
      // Fallback: try accumulating lines until JSON.parse succeeds
      const lines = chunkText.split('\n');
      let accumulated = '';
      for (const line of lines) {
        accumulated += (accumulated ? '\n' : '') + line;
        try {
          const data = JSON.parse(accumulated);
          if (Array.isArray(data)) {
            chunks.push(data);
            break;
          }
        } catch {
          // Keep accumulating
        }
      }
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
