import { withErrorHandling, toolJsonResponse } from '../index.js';
import { ResearchImportSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createResearchImportHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, taskId } = ResearchImportSchema.parse(args);

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(RPC_IDS.RESEARCH_IMPORT, [null, notebookId, taskId], sourcePath);

    let sourceId = '';
    let sourceTitle = '';
    let sourceCount = 0;

    if (Array.isArray(result)) {
      sourceId = String(result[0] ?? '');
      sourceTitle = String(result[1] ?? '');
      sourceCount = typeof result[2] === 'number' ? result[2] : 1;
    } else if (result && typeof result === 'object') {
      const obj = result as Record<string, unknown>;
      sourceId = String(obj['sourceId'] ?? obj['id'] ?? obj[0] ?? '');
      sourceTitle = String(obj['title'] ?? obj[1] ?? '');
      sourceCount = typeof obj['sourceCount'] === 'number'
        ? obj['sourceCount']
        : typeof obj[2] === 'number'
          ? (obj[2] as number)
          : 1;
    }

    return toolJsonResponse({
      success: true,
      taskId,
      importedSource: {
        id: sourceId,
        title: sourceTitle,
      },
      sourceCount,
      message: `Research results imported successfully as "${sourceTitle || 'Untitled'}".`,
    });
  });
}
