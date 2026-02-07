import { withErrorHandling, toolResponse } from '../index.js';
import { NotebookRenameSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createNotebookRenameHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = NotebookRenameSchema.parse(args);

    const sourcePath = `/notebook/${validated.notebookId}`;
    await rpcClient.callRpc(RPC_IDS.NOTEBOOK_UPDATE, [
      null,
      [validated.notebookId, validated.title],
    ], sourcePath);

    return toolResponse(
      `Notebook "${validated.notebookId}" renamed to "${validated.title}" successfully.`,
    );
  });
}
