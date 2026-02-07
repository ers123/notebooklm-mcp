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

    const result = await rpcClient.callRpc(rpcId, [null, notebookId, query]);

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
