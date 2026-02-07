import { ValidationError } from '../errors.js';

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
 * Format: each chunk starts with a line containing the byte count,
 * followed by the JSON data of that many bytes.
 */
export function parseChunkedResponse(text: string): unknown[][] {
  const stripped = stripAntiXssi(text);
  const chunks: unknown[][] = [];
  let pos = 0;

  while (pos < stripped.length) {
    // Skip whitespace
    while (pos < stripped.length && /\s/.test(stripped[pos])) pos++;
    if (pos >= stripped.length) break;

    // Read byte count line
    const newlineIdx = stripped.indexOf('\n', pos);
    if (newlineIdx === -1) break;

    const byteCountStr = stripped.slice(pos, newlineIdx).trim();
    const byteCount = parseInt(byteCountStr, 10);
    if (isNaN(byteCount) || byteCount <= 0) break;

    pos = newlineIdx + 1;

    // Read the JSON chunk (byteCount bytes)
    const chunkText = stripped.slice(pos, pos + byteCount);
    pos += byteCount;

    try {
      const parsed = JSON.parse(chunkText);
      if (Array.isArray(parsed)) {
        chunks.push(parsed);
      }
    } catch {
      // Skip malformed chunks
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

      // wrb.fr structure: [["wrb.fr", rpcId, resultJson, ...], ...]
      if (envelope[0] === 'wrb.fr' && envelope[1] === rpcId) {
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
    throw new ValidationError('Empty or unparseable response from API');
  }
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
