import { withErrorHandling, toolJsonResponse } from '../index.js';
import { SourceSyncDriveSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createSourceSyncDriveHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, sourceId } = SourceSyncDriveSchema.parse(args);

    const result = await rpcClient.callRpc(
      RPC_IDS.SOURCE_SYNC_DRIVE,
      [null, [sourceId], [2]],
    );

    return toolJsonResponse({
      success: true,
      notebookId,
      sourceId,
      message: 'Drive source sync initiated',
      result,
    });
  });
}
