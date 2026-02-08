import { withErrorHandling, toolJsonResponse } from '../index.js';
import { StudioStatusSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import { logger } from '../../utils/logger.js';
import type { ToolResponse } from '../../types.js';

// Studio type code to name mapping
const TYPE_NAMES: Record<number, string> = {
  1: 'audio',
  2: 'report',
  3: 'video',
  4: 'flashcards',
  7: 'infographic',
  8: 'slide_deck',
  9: 'data_table',
};

// Status code mapping
function mapStatus(code: unknown): string {
  if (code === 1) return 'in_progress';
  if (code === 3) return 'completed';
  if (code === 2) return 'failed';
  return 'unknown';
}

// Extract content URL from artifact based on type
function extractContentUrl(artifactData: unknown[], typeCode: number): string | undefined {
  try {
    // Audio: options at index 6, URL at [3]
    if (typeCode === 1 && artifactData.length > 6) {
      const opts = artifactData[6];
      if (Array.isArray(opts) && opts.length > 3 && typeof opts[3] === 'string') {
        return opts[3];
      }
    }
    // Video: options at index 8, URL at [3]
    if (typeCode === 3 && artifactData.length > 8) {
      const opts = artifactData[8];
      if (Array.isArray(opts) && opts.length > 3 && typeof opts[3] === 'string') {
        return opts[3];
      }
    }
    // Infographic: options at index 14
    if (typeCode === 7 && artifactData.length > 14) {
      const opts = artifactData[14];
      if (Array.isArray(opts)) {
        // Search for URL string in the options
        for (const item of opts) {
          if (typeof item === 'string' && item.startsWith('http')) return item;
          if (Array.isArray(item)) {
            for (const sub of item) {
              if (typeof sub === 'string' && sub.startsWith('http')) return sub;
            }
          }
        }
      }
    }
    // Slide deck: options at index 16
    if (typeCode === 8 && artifactData.length > 16) {
      const opts = artifactData[16];
      if (Array.isArray(opts)) {
        for (const item of opts) {
          if (typeof item === 'string' && item.startsWith('http')) return item;
          if (Array.isArray(item)) {
            for (const sub of item) {
              if (typeof sub === 'string' && sub.startsWith('http')) return sub;
            }
          }
        }
      }
    }
  } catch {
    // Graceful fallback
  }
  return undefined;
}

interface ArtifactInfo {
  artifactId: string;
  title: string;
  type: string;
  typeCode: number;
  status: string;
  statusCode: unknown;
  contentUrl?: string;
}

export function createStudioStatusHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, artifactId } = StudioStatusSchema.parse(args);

    const sourcePath = `/notebook/${notebookId}`;
    const result = await rpcClient.callRpc(
      RPC_IDS.STUDIO_STATUS,
      [[2], notebookId, 'NOT artifact.status = "ARTIFACT_STATUS_SUGGESTED"'],
      sourcePath,
    );

    const artifacts: ArtifactInfo[] = [];

    if (Array.isArray(result)) {
      // Result is wrapped: result[0] contains the artifact list
      const artifactList = Array.isArray(result[0]) ? result[0] : result;
      for (const entry of artifactList) {
        if (!Array.isArray(entry)) continue;

        const id = typeof entry[0] === 'string' ? entry[0] : '';
        const title = typeof entry[1] === 'string' ? entry[1] : 'Untitled';
        const typeCode = typeof entry[2] === 'number' ? entry[2] : 0;
        const statusCode = entry[4];
        const contentUrl = extractContentUrl(entry, typeCode);

        if (id) {
          artifacts.push({
            artifactId: id,
            title,
            type: TYPE_NAMES[typeCode] || `type_${typeCode}`,
            typeCode,
            status: mapStatus(statusCode),
            statusCode,
            contentUrl,
          });
        }
      }

      logger.info(`studio_status: found ${artifacts.length} artifact(s) for notebook ${notebookId}`);
    }

    // If a specific artifactId was requested, filter to just that one
    if (artifactId) {
      const match = artifacts.find(a => a.artifactId === artifactId);
      if (match) {
        return toolJsonResponse(match);
      }
      // Not found — return all with a note
      return toolJsonResponse({
        requestedArtifactId: artifactId,
        found: false,
        allArtifacts: artifacts,
      });
    }

    return toolJsonResponse({
      notebookId,
      artifacts,
      total: artifacts.length,
    });
  });
}
