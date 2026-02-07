import { withErrorHandling, toolJsonResponse } from '../index.js';
import { AudioCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, STUDIO_TYPES, CodeMapper } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createAudioCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, format, length, language, focusPrompt } = AudioCreateSchema.parse(args);

    const formatCode = CodeMapper.audioFormat(format);
    const lengthCode = CodeMapper.audioLength(length);

    const params = [
      null,
      notebookId,
      null,
      [STUDIO_TYPES.AUDIO, formatCode, lengthCode, language || null, focusPrompt || null],
    ];

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(RPC_IDS.STUDIO_CREATE, params, sourcePath);
    const artifactId = Array.isArray(result) ? (result[0] ?? 'unknown') : 'unknown';

    return toolJsonResponse({
      artifactId: String(artifactId),
      type: 'audio',
      status: 'generating',
    });
  });
}
