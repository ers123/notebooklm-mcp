import { withErrorHandling, toolJsonResponse } from '../index.js';
import { MindMapListSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import { logger } from '../../utils/logger.js';
import type { ToolResponse } from '../../types.js';

interface MindMapEntry {
  mindMapId: string;
  title: string;
}

export function createMindMapListHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId } = MindMapListSchema.parse(args);

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(RPC_IDS.MIND_MAP_LIST, [notebookId, [2]], sourcePath);

    const mindMaps: MindMapEntry[] = [];

    if (Array.isArray(result) && Array.isArray(result[0])) {
      for (const entry of result[0]) {
        if (!Array.isArray(entry)) continue;

        // Structure: [mind_map_id, [mind_map_id, json, metadata, null, title]]
        const id = typeof entry[0] === 'string' ? entry[0] : '';
        const detail = Array.isArray(entry[1]) ? entry[1] : null;
        const title = detail && typeof detail[4] === 'string' ? detail[4] : 'Untitled';

        if (id) {
          mindMaps.push({ mindMapId: id, title });
        }
      }
    }

    logger.info(`mind_map_list: found ${mindMaps.length} mind map(s) for notebook ${notebookId}`);

    return toolJsonResponse({
      notebookId,
      mindMaps,
      total: mindMaps.length,
    });
  });
}
