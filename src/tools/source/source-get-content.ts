import { withErrorHandling, toolResponse } from '../index.js';
import { SourceGetContentSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createSourceGetContentHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, sourceId } = SourceGetContentSchema.parse(args);

    const result = await rpcClient.callRpc(
      RPC_IDS.SOURCE_GET_CONTENT,
      [[sourceId], [2], [2]],
    );

    // Parse the source original text content from the result
    let content = '';

    if (typeof result === 'string') {
      content = result;
    } else if (Array.isArray(result)) {
      // Walk the result to find the text content (typically the longest string)
      const strings: string[] = [];
      const extractStrings = (data: unknown): void => {
        if (typeof data === 'string' && data.length > 0) {
          strings.push(data);
        } else if (Array.isArray(data)) {
          for (const item of data) {
            extractStrings(item);
          }
        }
      };
      extractStrings(result);

      // The original content is typically the longest string in the response
      if (strings.length > 0) {
        content = strings.reduce((a, b) => (a.length >= b.length ? a : b));
      }
    }

    if (!content) {
      return toolResponse(`No content found for source ${sourceId} in notebook ${notebookId}.`);
    }

    return toolResponse(content);
  });
}
