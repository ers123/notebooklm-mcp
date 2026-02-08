import { withErrorHandling, toolResponse } from '../index.js';
import { ChatConfigureSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, CodeMapper } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createChatConfigureHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = ChatConfigureSchema.parse(args);

    const goalCode = validated.goal
      ? CodeMapper.chatGoal(validated.goal)
      : null;

    const responseLengthCode = validated.responseLength
      ? CodeMapper.responseLength(validated.responseLength)
      : null;

    const customPrompt = validated.customPrompt ?? null;

    const sourcePath = `/notebook/${validated.notebookId}`;
    await rpcClient.callRpc(RPC_IDS.NOTEBOOK_UPDATE, [
      validated.notebookId,
      [[null, null, null, null, null, null, null, [goalCode, responseLengthCode, customPrompt]]],
    ], sourcePath);

    const appliedSettings: string[] = [];
    if (validated.goal) {
      appliedSettings.push(`goal=${validated.goal}`);
    }
    if (validated.responseLength) {
      appliedSettings.push(`responseLength=${validated.responseLength}`);
    }
    if (validated.customPrompt) {
      appliedSettings.push(`customPrompt="${validated.customPrompt}"`);
    }

    const settingsStr = appliedSettings.length > 0
      ? appliedSettings.join(', ')
      : 'no changes';

    return toolResponse(
      `Chat configuration updated for notebook "${validated.notebookId}": ${settingsStr}.`,
    );
  });
}
