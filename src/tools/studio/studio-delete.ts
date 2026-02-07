import { withErrorHandling, toolResponse } from '../index.js';
import { StudioDeleteSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import { ValidationError } from '../../errors.js';
import type { ToolResponse } from '../../types.js';

export function createStudioDeleteHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = StudioDeleteSchema.parse(args);

    if (validated.confirm !== true) {
      throw new ValidationError(
        'Deletion not confirmed. Set confirm to true to delete the studio artifact.',
      );
    }

    await rpcClient.callRpc(RPC_IDS.STUDIO_DELETE, [null, validated.notebookId, [validated.artifactId]]);

    return toolResponse(
      `Studio artifact "${validated.artifactId}" deleted successfully.`,
    );
  });
}
