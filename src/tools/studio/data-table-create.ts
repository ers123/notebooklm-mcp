import { withErrorHandling, toolJsonResponse } from '../index.js';
import { DataTableCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, STUDIO_TYPES } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createDataTableCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, description, language } = DataTableCreateSchema.parse(args);

    const params = [
      null,
      notebookId,
      null,
      [STUDIO_TYPES.DATA_TABLE, null, null, language || null, description || null],
    ];

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(RPC_IDS.STUDIO_CREATE, params, sourcePath);
    const artifactId = Array.isArray(result) ? (result[0] ?? 'unknown') : 'unknown';

    return toolJsonResponse({
      artifactId: String(artifactId),
      type: 'data_table',
      status: 'generating',
    });
  });
}
