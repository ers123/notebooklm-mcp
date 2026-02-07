import { withErrorHandling, toolJsonResponse } from '../index.js';
import { NotebookGetSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import { logger } from '../../utils/logger.js';
import type { ToolResponse } from '../../types.js';

interface SourceEntry {
  id: string;
  title: string;
}

export function createNotebookGetHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = NotebookGetSchema.parse(args);

    const result = await rpcClient.callRpc(RPC_IDS.NOTEBOOK_GET, [null, validated.notebookId]);

    // DEBUG: Include raw result info in response for troubleshooting
    const debugInfo: Record<string, unknown> = {
      resultType: result === null ? 'null' : typeof result,
      isArray: Array.isArray(result),
    };

    if (result === null || result === undefined) {
      debugInfo.note = 'RPC returned null — wrb.fr envelope may not match rpcId';
      return toolJsonResponse({
        id: validated.notebookId,
        title: 'Untitled',
        sources: [],
        sourceCount: 0,
        _debug: debugInfo,
      });
    }

    if (Array.isArray(result)) {
      debugInfo.arrayLength = result.length;
      // Show structure of first few elements
      for (let i = 0; i < Math.min(result.length, 5); i++) {
        const elem = result[i];
        if (Array.isArray(elem)) {
          debugInfo[`[${i}]`] = `array(${elem.length})`;
          // Show first 3 sub-elements
          for (let j = 0; j < Math.min(elem.length, 3); j++) {
            const sub = elem[j];
            if (typeof sub === 'string') {
              debugInfo[`[${i}][${j}]`] = sub.slice(0, 100);
            } else if (Array.isArray(sub)) {
              debugInfo[`[${i}][${j}]`] = `array(${sub.length})`;
            } else {
              debugInfo[`[${i}][${j}]`] = String(sub).slice(0, 50);
            }
          }
        } else if (typeof elem === 'string') {
          debugInfo[`[${i}]`] = elem.slice(0, 100);
        } else {
          debugInfo[`[${i}]`] = `${typeof elem}: ${String(elem).slice(0, 50)}`;
        }
      }
    } else {
      debugInfo.rawPreview = JSON.stringify(result).slice(0, 300);
    }

    let notebookId = validated.notebookId;
    let title = 'Untitled';
    const sources: SourceEntry[] = [];

    if (Array.isArray(result)) {
      // Structure: result = [[title, sources_array, notebook_id, emoji, ...], ...]
      const notebookInfo = result[0];

      if (Array.isArray(notebookInfo)) {
        title = typeof notebookInfo[0] === 'string' ? notebookInfo[0] : 'Untitled';
        notebookId = typeof notebookInfo[2] === 'string' ? notebookInfo[2] : validated.notebookId;

        const sourcesArray = notebookInfo[1];
        if (Array.isArray(sourcesArray)) {
          for (const source of sourcesArray) {
            if (Array.isArray(source)) {
              let sourceId = '';
              let sourceTitle = 'Untitled source';

              if (Array.isArray(source[0]) && source[0].length > 0) {
                sourceId = String(source[0][0]);
              } else if (typeof source[0] === 'string') {
                sourceId = source[0];
              }

              if (typeof source[1] === 'string') {
                sourceTitle = source[1];
              } else if (typeof source[2] === 'string') {
                sourceTitle = source[2];
              }

              if (sourceId) {
                sources.push({ id: sourceId, title: sourceTitle });
              }
            }
          }
        }
      }
    }

    return toolJsonResponse({
      id: notebookId,
      title,
      sources,
      sourceCount: sources.length,
      _debug: debugInfo,
    });
  });
}
