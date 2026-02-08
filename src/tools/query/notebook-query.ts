import { withErrorHandling, toolJsonResponse } from '../index.js';
import { NotebookQuerySchema } from '../schemas.js';
import { QueryClient } from '../../api/query-client.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import { ValidationError } from '../../errors.js';
import { logger } from '../../utils/logger.js';
import type { ToolResponse } from '../../types.js';

/**
 * Extract source IDs from notebook data returned by NOTEBOOK_GET.
 * Structure: result[0][1] = sources array, each source[0][0] = source ID.
 */
function extractSourceIds(notebookData: unknown): string[] {
  if (!Array.isArray(notebookData)) {
    logger.error(`extractSourceIds: not an array, got ${typeof notebookData}`);
    return [];
  }

  logger.info(`extractSourceIds: top-level array length=${notebookData.length}`);

  // Log structure for debugging
  for (let i = 0; i < Math.min(notebookData.length, 3); i++) {
    const item = notebookData[i];
    if (Array.isArray(item)) {
      logger.info(`  [${i}]: array(${item.length}) first=${typeof item[0] === 'string' ? item[0].slice(0, 50) : typeof item[0]}`);
    } else {
      logger.info(`  [${i}]: ${typeof item} = ${String(item).slice(0, 80)}`);
    }
  }

  // Try standard structure: result[0] = [title, sources, id, ...]
  const notebookInfo = notebookData[0];
  if (Array.isArray(notebookInfo) && notebookInfo.length >= 2) {
    const sourcesArray = notebookInfo[1];
    if (Array.isArray(sourcesArray)) {
      logger.info(`Found sources array at [0][1], length=${sourcesArray.length}`);
      const ids = extractIdsFromSourcesArray(sourcesArray);
      if (ids.length > 0) return ids;
    }
  }

  // Fallback: search for arrays that look like source IDs (UUID pattern)
  logger.warn('Standard extraction failed, trying deep search...');
  return deepSearchSourceIds(notebookData);
}

function extractIdsFromSourcesArray(sourcesArray: unknown[]): string[] {
  const ids: string[] = [];
  for (const source of sourcesArray) {
    if (!Array.isArray(source)) continue;

    // Try source[0][0] (standard: [[source_id], ...])
    if (Array.isArray(source[0]) && source[0].length > 0 && typeof source[0][0] === 'string') {
      ids.push(source[0][0]);
      continue;
    }
    // Try source[0] directly (if source ID is the first element)
    if (typeof source[0] === 'string' && /^[0-9a-f-]{36}$/.test(source[0])) {
      ids.push(source[0]);
    }
  }
  return ids;
}

/**
 * Deep search through nested arrays to find UUID-like source IDs.
 */
function deepSearchSourceIds(data: unknown, depth: number = 0): string[] {
  if (depth > 5 || !Array.isArray(data)) return [];

  const ids: string[] = [];
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  for (const item of data) {
    if (typeof item === 'string' && uuidPattern.test(item)) {
      // Skip the notebook ID itself (usually at position [2])
      if (!ids.includes(item)) ids.push(item);
    }
    if (Array.isArray(item)) {
      ids.push(...deepSearchSourceIds(item, depth + 1));
    }
  }

  return ids;
}

export function createNotebookQueryHandler(queryClient: QueryClient, rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, question, followUp } = NotebookQuerySchema.parse(args);

    // First, fetch notebook data to get source IDs
    logger.info(`Fetching source IDs for notebook ${notebookId}...`);
    const sourcePath = `/notebook/${notebookId}`;
    const notebookData = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_GET, [notebookId, null, [2], null, 0], sourcePath);
    const sourceIds = extractSourceIds(notebookData);

    if (sourceIds.length === 0) {
      // Log the raw structure for debugging
      const preview = JSON.stringify(notebookData).slice(0, 500);
      logger.error(`No source IDs extracted. Raw notebook data preview: ${preview}`);
      throw new ValidationError(
        'No sources found in this notebook. Add sources before querying.'
      );
    }

    logger.info(`Found ${sourceIds.length} source(s), sending query...`);

    const result = await queryClient.query(sourceIds, question, notebookId, followUp);

    return toolJsonResponse({
      answer: result.answer,
      sources: result.sources,
      ...(result.warnings.length > 0 && { warnings: result.warnings }),
    });
  });
}
