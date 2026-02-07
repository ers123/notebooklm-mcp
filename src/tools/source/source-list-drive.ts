import { withErrorHandling, toolJsonResponse } from '../index.js';
import { SourceListDriveSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS, SOURCE_TYPES } from '../../api/constants.js';
import type { ToolResponse, DriveSourceInfo } from '../../types.js';

export function createSourceListDriveHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId } = SourceListDriveSchema.parse(args);

    // First, get all sources from the notebook
    const sourcePath = `/notebook/${notebookId}`;
    const notebookResult = await rpcClient.callRpc(
      RPC_IDS.NOTEBOOK_GET,
      [null, notebookId],
      sourcePath,
    );

    // Extract source entries from the notebook data
    const allSources: Array<{ id: string; title?: string; type?: number; driveId?: string }> = [];
    if (Array.isArray(notebookResult)) {
      // Sources are typically in a nested array within the notebook result
      const extractSources = (data: unknown[]): void => {
        for (const item of data) {
          if (Array.isArray(item)) {
            // Check if this looks like a source entry (has an ID-like string and type number)
            const hasId = typeof item[0] === 'string' && item[0].length > 0;
            const hasType = typeof item[1] === 'number' || typeof item[2] === 'number';
            if (hasId && hasType) {
              allSources.push({
                id: item[0] as string,
                title: typeof item[1] === 'string' ? item[1] as string : undefined,
                type: typeof item[2] === 'number' ? item[2] as number : (typeof item[1] === 'number' ? item[1] as number : undefined),
                driveId: typeof item[3] === 'string' ? item[3] as string : undefined,
              });
            } else {
              extractSources(item);
            }
          }
        }
      };
      extractSources(notebookResult);
    }

    // Filter to Drive sources (type === 12 or has driveId)
    const driveSources = allSources.filter(
      s => s.type === SOURCE_TYPES.DRIVE || s.driveId,
    );

    // For each Drive source, get sync status via SOURCE_LIST_DRIVE
    const driveSourceInfos: DriveSourceInfo[] = [];
    for (const source of driveSources) {
      try {
        const driveResult = await rpcClient.callRpc(
          RPC_IDS.SOURCE_LIST_DRIVE,
          [null, notebookId, source.id],
          sourcePath,
        );

        // Parse sync status from the drive result
        let syncedAt: string | undefined;
        let needsSync = false;
        let syncStatus: 'synced' | 'pending' | 'error' = 'synced';

        if (Array.isArray(driveResult)) {
          // Extract sync metadata from the result
          for (const item of driveResult) {
            if (typeof item === 'string' && /\d{4}-\d{2}-\d{2}/.test(item)) {
              syncedAt = item;
            }
            if (typeof item === 'boolean') {
              needsSync = item;
            }
            if (typeof item === 'number') {
              // Status codes: interpret based on API behavior
              if (item === 1) syncStatus = 'pending';
              if (item === 2) syncStatus = 'error';
            }
          }
        }

        if (needsSync) {
          syncStatus = 'pending';
        }

        driveSourceInfos.push({
          id: source.id,
          title: source.title || 'Untitled Drive Source',
          type: 'drive',
          driveFileId: source.driveId || '',
          syncedAt,
          needsSync,
          syncStatus,
        });
      } catch {
        // If we can't get sync status, still include the source
        driveSourceInfos.push({
          id: source.id,
          title: source.title || 'Untitled Drive Source',
          type: 'drive',
          driveFileId: source.driveId || '',
          needsSync: false,
          syncStatus: 'synced',
        });
      }
    }

    return toolJsonResponse({
      notebookId,
      driveSources: driveSourceInfos,
      total: driveSourceInfos.length,
    });
  });
}
