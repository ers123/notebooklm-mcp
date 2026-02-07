import { withErrorHandling, toolJsonResponse } from '../index.js';
import { NotebookListSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

interface NotebookEntry {
  id: string;
  title: string;
  sourceCount: number;
}

export function createNotebookListHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    NotebookListSchema.parse(args);

    const result = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_LIST, []);

    const notebooks: NotebookEntry[] = [];

    if (Array.isArray(result)) {
      for (const entry of result) {
        if (Array.isArray(entry)) {
          notebooks.push({
            id: String(entry[0] ?? ''),
            title: String(entry[1] ?? 'Untitled'),
            sourceCount: typeof entry[12] === 'number' ? entry[12] : 0,
          });
        }
      }
    }

    return toolJsonResponse({
      notebooks,
      count: notebooks.length,
    });
  });
}
