import { withErrorHandling, toolResponse } from '../index.js';
import { NotebookDeleteSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import { ValidationError } from '../../errors.js';
import type { ToolResponse } from '../../types.js';

export function createNotebookDeleteHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = NotebookDeleteSchema.parse(args);

    if (validated.confirm !== true) {
      throw new ValidationError(
        'Deletion not confirmed. Set confirm to true to delete the notebook.',
      );
    }

    const sourcePath = `/notebook/${validated.notebookId}`;
    await rpcClient.callRpc(RPC_IDS.NOTEBOOK_DELETE, [null, [validated.notebookId]], sourcePath);

    return toolResponse(
      `Notebook "${validated.notebookId}" deleted successfully.`,
    );
  });
}
