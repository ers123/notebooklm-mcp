import { withErrorHandling, toolJsonResponse } from '../index.js';
import { NotebookDescribeSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createNotebookDescribeHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = NotebookDescribeSchema.parse(args);

    const sourcePath = `/notebook/${validated.notebookId}`;
    const result = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_DESCRIBE, [null, validated.notebookId], sourcePath);

    let summary = '';
    let topics: string[] = [];
    let sourceCount = 0;

    if (Array.isArray(result)) {
      summary = typeof result[0] === 'string' ? result[0] : '';

      if (Array.isArray(result[1])) {
        topics = result[1]
          .filter((t: unknown) => typeof t === 'string')
          .map((t: unknown) => String(t));
      }

      if (typeof result[2] === 'number') {
        sourceCount = result[2];
      }
    } else if (result && typeof result === 'object') {
      const obj = result as Record<string, unknown>;
      summary = typeof obj['summary'] === 'string' ? obj['summary'] : '';
      topics = Array.isArray(obj['topics'])
        ? (obj['topics'] as unknown[]).filter((t): t is string => typeof t === 'string')
        : [];
      sourceCount = typeof obj['sourceCount'] === 'number' ? obj['sourceCount'] : 0;
    }

    return toolJsonResponse({
      summary,
      topics,
      sourceCount,
    });
  });
}
