import { withErrorHandling, toolJsonResponse } from '../index.js';
import { MindMapDeleteSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createMindMapDeleteHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, mindMapId, confirm } = MindMapDeleteSchema.parse(args);

    if (!confirm) {
      return toolJsonResponse({
        error: 'Deletion requires confirm=true',
      });
    }

    const sourcePath = `/notebook/${notebookId}`;
    await rpcClient.callRpc(RPC_IDS.MIND_MAP_DELETE, [notebookId, mindMapId, [2]], sourcePath);

    return toolJsonResponse({
      deleted: true,
      mindMapId,
      notebookId,
    });
  });
}
