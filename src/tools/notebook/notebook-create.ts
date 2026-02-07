import { withErrorHandling, toolJsonResponse } from '../index.js';
import { NotebookCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import { logger } from '../../utils/logger.js';
import type { ToolResponse } from '../../types.js';

export function createNotebookCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = NotebookCreateSchema.parse(args);

    const result = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_CREATE, [null, validated.title]);

    let notebookId = '';
    let title = validated.title;

    if (Array.isArray(result)) {
      // Try nested structure: result = [[title, sources, id, ...]]
      const info = result[0];
      if (Array.isArray(info)) {
        title = typeof info[0] === 'string' ? info[0] : validated.title;
        notebookId = typeof info[2] === 'string' ? info[2] : '';
        logger.info(`notebook_create: parsed nested structure, id=${notebookId}`);
      } else {
        // Flat structure: result = [id, title, ...] or [title, sources, id, ...]
        // Try position [2] for ID first (consistent with notebook_list/get)
        if (typeof result[2] === 'string' && /^[0-9a-f-]{36}$/.test(result[2])) {
          notebookId = result[2];
          title = typeof result[0] === 'string' ? result[0] : validated.title;
        } else if (typeof result[0] === 'string') {
          notebookId = result[0];
          title = typeof result[1] === 'string' ? result[1] : validated.title;
        }
        logger.info(`notebook_create: parsed flat structure, id=${notebookId}`);
      }

      if (!notebookId) {
        const preview = JSON.stringify(result).slice(0, 500);
        logger.warn(`notebook_create: could not extract ID from: ${preview}`);
      }
    }

    return toolJsonResponse({
      id: notebookId,
      title,
      message: `Notebook "${title}" created successfully.`,
    });
  });
}
