import { withErrorHandling, toolJsonResponse } from '../index.js';
import { NotebookGetSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

interface SourceEntry {
  id: string;
  title: string;
  type: string;
}

export function createNotebookGetHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = NotebookGetSchema.parse(args);

    const result = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_GET, [null, validated.notebookId]);

    let notebookId = validated.notebookId;
    let title = 'Untitled';
    const sources: SourceEntry[] = [];

    if (Array.isArray(result)) {
      notebookId = String(result[0] ?? validated.notebookId);
      title = String(result[1] ?? 'Untitled');

      const sourcesArray = result[2];
      if (Array.isArray(sourcesArray)) {
        for (const source of sourcesArray) {
          if (Array.isArray(source)) {
            sources.push({
              id: String(source[0] ?? ''),
              title: String(source[1] ?? 'Untitled source'),
              type: String(source[2] ?? 'unknown'),
            });
          }
        }
      }
    }

    return toolJsonResponse({
      id: notebookId,
      title,
      sources,
      sourceCount: sources.length,
    });
  });
}
