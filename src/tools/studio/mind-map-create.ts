import { withErrorHandling, toolJsonResponse } from '../index.js';
import { MindMapCreateSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import { logger } from '../../utils/logger.js';
import type { ToolResponse } from '../../types.js';

export function createMindMapCreateHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, title } = MindMapCreateSchema.parse(args);

    // Step 0: Fetch source IDs from the notebook
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

    if (sourceIds.length === 0) {
      return toolJsonResponse({
        error: 'No sources found in notebook. Add sources before creating a mind map.',
      });
    }

    // Step 1: Generate mind map JSON (yyryJe)
    // Source IDs in triple-nested format: [[[sid1]], [[sid2]], ...]
    const sourcesTriple = sourceIds.map(sid => [[sid]]);

    const generateParams = [
      sourcesTriple,
      null, null, null, null,
      ['interactive_mindmap', [['[CONTEXT]', '']], ''],
      null,
      [2, null, [1]],
    ];

    logger.info(`mind_map_create: generating from ${sourceIds.length} source(s)`);
    const generateResult = await rpcClient.callRpc(RPC_IDS.MIND_MAP_GENERATE, generateParams, '/');

    // Extract the mind map JSON string from result[0]
    let mindMapJson = '';
    if (Array.isArray(generateResult) && typeof generateResult[0] === 'string') {
      mindMapJson = generateResult[0];
    } else if (typeof generateResult === 'string') {
      mindMapJson = generateResult;
    }

    if (!mindMapJson) {
      return toolJsonResponse({
        error: 'Mind map generation returned empty result',
        rawResultType: generateResult === null ? 'null' : typeof generateResult,
      });
    }

    // Step 2: Save mind map to notebook (CYK0Xb)
    // Source IDs in single-nested format: [[sid1], [sid2], ...]
    const sourcesSingle = sourceIds.map(sid => [sid]);
    const displayTitle = title || 'Mind Map';

    const saveParams = [
      notebookId,
      mindMapJson,
      [2, null, null, 5, sourcesSingle],
      null,
      displayTitle,
    ];

    const saveResult = await rpcClient.callRpc(RPC_IDS.MIND_MAP_SAVE, saveParams, sourcePath);

    // Parse save response: [[mind_map_id, json, metadata, null, title]]
    const inner = Array.isArray(saveResult) && Array.isArray(saveResult[0]) ? saveResult[0] : saveResult;
    const mindMapId = Array.isArray(inner) && typeof inner[0] === 'string' ? inner[0] : 'unknown';
    const savedTitle = Array.isArray(inner) && typeof inner[4] === 'string' ? inner[4] : displayTitle;

    // Parse the JSON to get root info
    let rootName = '';
    let childrenCount = 0;
    try {
      const parsed = JSON.parse(mindMapJson);
      rootName = parsed.name || '';
      childrenCount = Array.isArray(parsed.children) ? parsed.children.length : 0;
    } catch {
      // JSON parsing failed — still return the result
    }

    logger.info(`mind_map_create: saved as ${mindMapId}, root="${rootName}", branches=${childrenCount}`);

    return toolJsonResponse({
      mindMapId,
      notebookId,
      title: savedTitle,
      rootName,
      childrenCount,
      status: 'completed',
    });
  });
}
