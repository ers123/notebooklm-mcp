import { withErrorHandling, toolJsonResponse } from '../index.js';
import { StudioStatusSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createStudioStatusHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, artifactId } = StudioStatusSchema.parse(args);

    const result = await rpcClient.callRpc(RPC_IDS.STUDIO_STATUS, [null, notebookId, artifactId]);

    let status = 'unknown';
    let type = 'unknown';
    let title: string | undefined;
    let url: string | undefined;

    if (Array.isArray(result)) {
      status = typeof result[0] === 'string' ? result[0] : 'unknown';
      type = typeof result[1] === 'string' ? result[1] : 'unknown';
      title = typeof result[2] === 'string' ? result[2] : undefined;
      url = typeof result[3] === 'string' ? result[3] : undefined;
    } else if (result && typeof result === 'object') {
      const obj = result as Record<string, unknown>;
      status = String(obj['status'] ?? obj[0] ?? 'unknown');
      type = String(obj['type'] ?? obj[1] ?? 'unknown');
      title = typeof obj['title'] === 'string' ? obj['title'] : (typeof obj[2] === 'string' ? (obj[2] as string) : undefined);
      url = typeof obj['url'] === 'string' ? obj['url'] : (typeof obj[3] === 'string' ? (obj[3] as string) : undefined);
    }

    return toolJsonResponse({
      artifactId,
      status,
      type,
      title,
      url,
    });
  });
}
