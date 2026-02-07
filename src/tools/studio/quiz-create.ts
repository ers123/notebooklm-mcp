import { withErrorHandling, toolJsonResponse } from '../index.js';
import { QuizCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, STUDIO_TYPES, CodeMapper } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createQuizCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, questionCount, difficulty } = QuizCreateSchema.parse(args);

    const difficultyCode = CodeMapper.difficulty(difficulty);

    const params = [
      null,
      notebookId,
      null,
      [STUDIO_TYPES.QUIZ, difficultyCode, questionCount],
    ];

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(RPC_IDS.STUDIO_CREATE, params, sourcePath);
    const artifactId = Array.isArray(result) ? (result[0] ?? 'unknown') : 'unknown';

    return toolJsonResponse({
      artifactId: String(artifactId),
      type: 'quiz',
      status: 'generating',
    });
  });
}
