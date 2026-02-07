import { withErrorHandling, toolJsonResponse } from '../index.js';
import { SourceDescribeSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createSourceDescribeHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, sourceId } = SourceDescribeSchema.parse(args);

    const result = await rpcClient.callRpc(
      RPC_IDS.SOURCE_DESCRIBE,
      [null, notebookId, sourceId],
    );

    // Parse the AI-generated source description from the result
    let description = '';
    let title: string | undefined;

    if (Array.isArray(result)) {
      // The description is typically in the first string element
      for (const item of result) {
        if (typeof item === 'string' && item.length > 0 && !description) {
          description = item;
        }
        if (Array.isArray(item)) {
          for (const sub of item) {
            if (typeof sub === 'string' && sub.length > 0) {
              if (!title) {
                title = sub;
              } else if (!description) {
                description = sub;
              }
            }
          }
        }
      }
    } else if (typeof result === 'string') {
      description = result;
    }

    return toolJsonResponse({
      notebookId,
      sourceId,
      title,
      description: description || 'No description available',
      raw: !description ? result : undefined,
    });
  });
}
