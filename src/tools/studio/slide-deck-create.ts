import { withErrorHandling, toolJsonResponse } from '../index.js';
import { SlideDeckCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, STUDIO_TYPES, CodeMapper } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createSlideDeckCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, format, length, language, focusPrompt } = SlideDeckCreateSchema.parse(args);

    const formatCode = CodeMapper.slideDeckFormat(format);
    const lengthCode = CodeMapper.slideDeckLength(length);

    const params = [
      null,
      notebookId,
      null,
      [STUDIO_TYPES.SLIDE_DECK, formatCode, lengthCode, language || null, focusPrompt || null],
    ];

    const result = await rpcClient.callRpc(RPC_IDS.STUDIO_CREATE, params);
    const artifactId = Array.isArray(result) ? (result[0] ?? 'unknown') : 'unknown';

    return toolJsonResponse({
      artifactId: String(artifactId),
      type: 'slide_deck',
      status: 'generating',
    });
  });
}
