import { withErrorHandling, toolJsonResponse } from '../index.js';
import { ResearchStatusSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createResearchStatusHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, taskId } = ResearchStatusSchema.parse(args);

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(RPC_IDS.RESEARCH_STATUS, [null, null, notebookId], sourcePath);

    let status = 'unknown';
    let progress = 0;

    if (Array.isArray(result)) {
      status = String(result[0] ?? 'unknown');
      progress = typeof result[1] === 'number' ? result[1] : 0;
    } else if (result && typeof result === 'object') {
      const obj = result as Record<string, unknown>;
      status = String(obj['status'] ?? obj[0] ?? 'unknown');
      progress = typeof obj['progress'] === 'number'
        ? obj['progress']
        : typeof obj[1] === 'number'
          ? (obj[1] as number)
          : 0;
    }

    return toolJsonResponse({
      taskId,
      status,
      progress,
    });
  });
}
