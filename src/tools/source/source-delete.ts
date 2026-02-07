import { withErrorHandling, toolResponse } from '../index.js';
import { SourceDeleteSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import { ValidationError } from '../../errors.js';
import type { ToolResponse } from '../../types.js';

export function createSourceDeleteHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, sourceId, confirm } = SourceDeleteSchema.parse(args);

    if (confirm !== true) {
      throw new ValidationError('Deletion not confirmed. Set confirm to true to delete the source.');
    }

    const sourcePath = `/notebook/${notebookId}`;
    await rpcClient.callRpc(
      RPC_IDS.SOURCE_DELETE,
      [null, notebookId, [sourceId]],
      sourcePath,
    );

    return toolResponse(`Source ${sourceId} deleted from notebook ${notebookId}.`);
  });
}
