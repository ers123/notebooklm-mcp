import { withErrorHandling, toolJsonResponse } from '../index.js';
import { ResearchStartSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createResearchStartHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, query, mode } = ResearchStartSchema.parse(args);

    const rpcId = mode === 'deep'
      ? RPC_IDS.RESEARCH_START_DEEP
      : RPC_IDS.RESEARCH_START_FAST;

    const params = mode === 'deep'
      ? [null, [1], [query, 1], 5, notebookId]
      : [[query, 1], null, 1, notebookId];

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(rpcId, params, sourcePath);

    let taskId = '';

    if (Array.isArray(result)) {
      taskId = String(result[0] ?? '');
    } else if (result && typeof result === 'object') {
      const obj = result as Record<string, unknown>;
      taskId = String(obj['id'] ?? obj['taskId'] ?? obj[0] ?? '');
    }

    return toolJsonResponse({
      taskId,
      mode,
      status: 'started',
    });
  });
}
