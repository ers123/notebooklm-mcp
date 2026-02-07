import { withErrorHandling, toolJsonResponse } from '../index.js';
import { ReportCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, CodeMapper } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createReportCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, reportFormat, customPrompt, language } = ReportCreateSchema.parse(args);

    const studioTypeCode = CodeMapper.reportFormat(reportFormat);

    const params = [
      null,
      notebookId,
      null,
      [studioTypeCode, null, null, language || null, customPrompt || null],
    ];

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(RPC_IDS.STUDIO_CREATE, params, sourcePath);
    const artifactId = Array.isArray(result) ? (result[0] ?? 'unknown') : 'unknown';

    return toolJsonResponse({
      artifactId: String(artifactId),
      type: reportFormat,
      status: 'generating',
    });
  });
}
