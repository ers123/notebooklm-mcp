import { withErrorHandling, toolJsonResponse } from '../index.js';
import { NotebookCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createNotebookCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = NotebookCreateSchema.parse(args);

    const result = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_CREATE, [null, validated.title]);

    let notebookId = '';
    let title = validated.title;

    if (Array.isArray(result)) {
      notebookId = String(result[0] ?? '');
      title = String(result[1] ?? validated.title);
    } else if (result && typeof result === 'object') {
      const obj = result as Record<string, unknown>;
      notebookId = String(obj['id'] ?? obj[0] ?? '');
      title = String(obj['title'] ?? obj[1] ?? validated.title);
    }

    return toolJsonResponse({
      id: notebookId,
      title,
      message: `Notebook "${title}" created successfully.`,
    });
  });
}
