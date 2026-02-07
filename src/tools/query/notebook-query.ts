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
  if (!Array.isArray(notebookData)) return [];

  const notebookInfo = notebookData[0];
  if (!Array.isArray(notebookInfo) || notebookInfo.length < 2) return [];

  const sourcesArray = notebookInfo[1];
  if (!Array.isArray(sourcesArray)) return [];

  const ids: string[] = [];
  for (const source of sourcesArray) {
    if (Array.isArray(source) && Array.isArray(source[0]) && source[0].length > 0) {
      const id = source[0][0];
      if (typeof id === 'string') {
        ids.push(id);
      }
    }
  }

  return ids;
}

export function createNotebookQueryHandler(queryClient: QueryClient, rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, question, followUp } = NotebookQuerySchema.parse(args);

    // First, fetch notebook data to get source IDs
    logger.info(`Fetching source IDs for notebook ${notebookId}...`);
    const notebookData = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_GET, [null, notebookId]);
    const sourceIds = extractSourceIds(notebookData);

    if (sourceIds.length === 0) {
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
