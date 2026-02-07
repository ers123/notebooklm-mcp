import { withErrorHandling, toolJsonResponse } from '../index.js';
import { SourceAddDriveSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, SOURCE_TYPES } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

export function createSourceAddDriveHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, driveFileId } = SourceAddDriveSchema.parse(args);

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(
      RPC_IDS.SOURCE_ADD,
      [null, notebookId, [[null, SOURCE_TYPES.DRIVE, driveFileId]]],
      sourcePath,
    );

    // Parse source info from the result
    const sources: Array<{ id?: string; title?: string; type?: string; driveFileId?: string }> = [];
    if (Array.isArray(result)) {
      for (const entry of result) {
        if (Array.isArray(entry)) {
          sources.push({
            id: typeof entry[0] === 'string' ? entry[0] : undefined,
            title: typeof entry[1] === 'string' ? entry[1] : undefined,
            type: 'drive',
            driveFileId,
          });
        }
      }
    }

    return toolJsonResponse({
      success: true,
      notebookId,
      driveFileId,
      sources: sources.length > 0 ? sources : undefined,
      raw: sources.length === 0 ? result : undefined,
    });
  });
}
