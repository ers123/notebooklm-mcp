import { withErrorHandling, toolJsonResponse } from '../index.js';
import { SourceAddUrlSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createSourceAddUrlHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, url } = SourceAddUrlSchema.parse(args);

    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

    const sourceEntry = isYouTube
      ? [null, null, null, null, null, null, null, [url], null, null, 1]
      : [null, null, [url], null, null, null, null, null, null, null, 1];

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(
      RPC_IDS.SOURCE_ADD,
      [sourceEntry, notebookId, [2]],
      sourcePath,
    );

    // Parse source info from the result
    const sources: Array<{ id?: string; title?: string; type?: string }> = [];
    if (Array.isArray(result)) {
      for (const entry of result) {
        if (Array.isArray(entry)) {
          sources.push({
            id: typeof entry[0] === 'string' ? entry[0] : undefined,
            title: typeof entry[1] === 'string' ? entry[1] : undefined,
            type: 'url',
          });
        }
      }
    }

    return toolJsonResponse({
      success: true,
      notebookId,
      url,
      sources: sources.length > 0 ? sources : undefined,
      raw: sources.length === 0 ? result : undefined,
    });
  });
}
