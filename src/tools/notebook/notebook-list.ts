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

    const result = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_LIST, [null, 1, null, [2]]);

    const notebooks: NotebookEntry[] = [];

    if (Array.isArray(result)) {
      // result[0] is the array of notebooks
      const notebookList = Array.isArray(result[0]) ? result[0] : result;

      for (const entry of notebookList) {
        if (Array.isArray(entry) && entry.length >= 3) {
          notebooks.push({
            id: String(entry[2] ?? ''),
            title: String(entry[0] ?? 'Untitled'),
            sourceCount: Array.isArray(entry[1]) ? entry[1].length : 0,
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
