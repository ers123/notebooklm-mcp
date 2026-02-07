import { withErrorHandling, toolJsonResponse } from '../index.js';
import { InfographicCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, STUDIO_TYPES, CodeMapper } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createInfographicCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, orientation, detailLevel, language, focusPrompt } = InfographicCreateSchema.parse(args);

    const orientationCode = CodeMapper.infographicOrientation(orientation);
    const detailCode = CodeMapper.detailLevel(detailLevel);

    const params = [
      null,
      notebookId,
      null,
      [STUDIO_TYPES.INFOGRAPHIC, orientationCode, detailCode, language || null, focusPrompt || null],
    ];

    const result = await rpcClient.callRpc(RPC_IDS.STUDIO_CREATE, params);
    const artifactId = Array.isArray(result) ? (result[0] ?? 'unknown') : 'unknown';

    return toolJsonResponse({
      artifactId: String(artifactId),
      type: 'infographic',
      status: 'generating',
    });
  });
}
