import { withErrorHandling, toolJsonResponse } from '../index.js';
import { FlashcardsCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, STUDIO_TYPES, CodeMapper } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createFlashcardsCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, difficulty } = FlashcardsCreateSchema.parse(args);

    const difficultyCode = CodeMapper.difficulty(difficulty);

    const params = [
      null,
      notebookId,
      null,
      [STUDIO_TYPES.FLASHCARDS, difficultyCode],
    ];

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(RPC_IDS.STUDIO_CREATE, params, sourcePath);
    const artifactId = Array.isArray(result) ? (result[0] ?? 'unknown') : 'unknown';

    return toolJsonResponse({
      artifactId: String(artifactId),
      type: 'flashcards',
      status: 'generating',
    });
  });
}
