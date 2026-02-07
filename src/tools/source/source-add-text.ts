import { withErrorHandling, toolJsonResponse } from '../index.js';
import { SourceAddTextSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, SOURCE_TYPES } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createSourceAddTextHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, title, content } = SourceAddTextSchema.parse(args);

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(
      RPC_IDS.SOURCE_ADD,
      [null, notebookId, [[null, SOURCE_TYPES.TEXT, null, null, null, title, content]]],
      sourcePath,
    );

    // Parse source info from the result
    const sources: Array<{ id?: string; title?: string; type?: string }> = [];
    if (Array.isArray(result)) {
      for (const entry of result) {
        if (Array.isArray(entry)) {
          sources.push({
            id: typeof entry[0] === 'string' ? entry[0] : undefined,
            title: typeof entry[1] === 'string' ? entry[1] : title,
            type: 'text',
          });
        }
      }
    }

    return toolJsonResponse({
      success: true,
      notebookId,
      title,
      sources: sources.length > 0 ? sources : undefined,
      raw: sources.length === 0 ? result : undefined,
    });
  });
}
