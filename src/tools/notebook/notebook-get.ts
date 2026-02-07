import { withErrorHandling, toolJsonResponse } from '../index.js';
import { NotebookGetSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import { logger } from '../../utils/logger.js';
import type { ToolResponse } from '../../types.js';

interface SourceEntry {
  id: string;
  title: string;
}

export function createNotebookGetHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = NotebookGetSchema.parse(args);

    const result = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_GET, [null, validated.notebookId]);

    let notebookId = validated.notebookId;
    let title = 'Untitled';
    const sources: SourceEntry[] = [];

    if (Array.isArray(result)) {
      // Structure: result = [[title, sources_array, notebook_id, emoji, ...], ...]
      const notebookInfo = result[0];

      if (Array.isArray(notebookInfo)) {
        title = typeof notebookInfo[0] === 'string' ? notebookInfo[0] : 'Untitled';
        notebookId = typeof notebookInfo[2] === 'string' ? notebookInfo[2] : validated.notebookId;

        const sourcesArray = notebookInfo[1];
        if (Array.isArray(sourcesArray)) {
          for (const source of sourcesArray) {
            if (Array.isArray(source)) {
              // Source structure: [[source_id], title_or_metadata, ...]
              let sourceId = '';
              let sourceTitle = 'Untitled source';

              if (Array.isArray(source[0]) && source[0].length > 0) {
                sourceId = String(source[0][0]);
              } else if (typeof source[0] === 'string') {
                sourceId = source[0];
              }

              // Title might be at position 1 or nested
              if (typeof source[1] === 'string') {
                sourceTitle = source[1];
              } else if (typeof source[2] === 'string') {
                sourceTitle = source[2];
              }

              if (sourceId) {
                sources.push({ id: sourceId, title: sourceTitle });
              }
            }
          }
        }

        logger.info(`notebook_get: "${title}" with ${sources.length} sources`);
      } else {
        // Log structure for debugging
        logger.warn(`notebook_get: unexpected structure at result[0]: ${typeof notebookInfo}`);
        const preview = JSON.stringify(result).slice(0, 500);
        logger.warn(`notebook_get raw preview: ${preview}`);
      }
    }

    return toolJsonResponse({
      id: notebookId,
      title,
      sources,
      sourceCount: sources.length,
    });
  });
}
