import { withErrorHandling, toolJsonResponse } from '../index.js';
import { ReportCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, CodeMapper } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createReportCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, reportFormat, customPrompt, language } = ReportCreateSchema.parse(args);

    const studioTypeCode = CodeMapper.reportFormat(reportFormat);

    // Fetch source IDs from the notebook
    const sourcePath = `/notebook/${notebookId}`;
    const notebookData = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_GET, [notebookId, null, [2], null, 0], sourcePath);
    const sourceIds: string[] = [];
    if (Array.isArray(notebookData) && Array.isArray(notebookData[0])) {
      const sourcesArray = notebookData[0][1];
      if (Array.isArray(sourcesArray)) {
        for (const source of sourcesArray) {
          if (Array.isArray(source) && Array.isArray(source[0]) && typeof source[0][0] === 'string') {
            sourceIds.push(source[0][0]);
          }
        }
      }
    }
    const sourcesNested = sourceIds.map(sid => [[sid]]);

    const params = [
      [2],
      notebookId,
      [null, null, 2, sourcesNested],
    ];

    const result = await rpcClient.callRpc(RPC_IDS.STUDIO_CREATE, params, sourcePath);
    const artifactData = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
    const artifactId = Array.isArray(artifactData) && typeof artifactData[0] === 'string' ? artifactData[0] : 'unknown';
    const statusCode = Array.isArray(artifactData) ? artifactData[4] : undefined;

    return toolJsonResponse({
      artifactId,
      type: reportFormat,
      status: statusCode === 1 ? 'in_progress' : statusCode === 3 ? 'completed' : 'generating',
    });
  });
}
