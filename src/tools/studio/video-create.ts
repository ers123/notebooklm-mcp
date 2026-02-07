import { withErrorHandling, toolJsonResponse } from '../index.js';
import { VideoCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, STUDIO_TYPES, CodeMapper } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createVideoCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, format, visualStyle, language, focusPrompt } = VideoCreateSchema.parse(args);

    const formatCode = CodeMapper.audioFormat(format);
    const styleCode = CodeMapper.videoStyle(visualStyle);

    const params = [
      null,
      notebookId,
      null,
      [STUDIO_TYPES.VIDEO, formatCode, null, language || null, focusPrompt || null, styleCode],
    ];

    const result = await rpcClient.callRpc(RPC_IDS.STUDIO_CREATE, params);
    const artifactId = Array.isArray(result) ? (result[0] ?? 'unknown') : 'unknown';

    return toolJsonResponse({
      artifactId: String(artifactId),
      type: 'video',
      status: 'generating',
    });
  });
}
