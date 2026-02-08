import { withErrorHandling, toolJsonResponse } from '../index.js';
import { NotebookDescribeSchema } from '../schemas.js';
import { RpcClient } from '../../api/rpc-client.js';
import { RPC_IDS } from '../../api/constants.js';
import type { ToolResponse } from '../../types.js';

interface SuggestedTopic {
  question: string;
  prompt: string;
}

export function createNotebookDescribeHandler(rpcClient: RpcClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const validated = NotebookDescribeSchema.parse(args);

    const sourcePath = `/notebook/${validated.notebookId}`;
    const result = await rpcClient.callRpc(
      RPC_IDS.NOTEBOOK_DESCRIBE, [validated.notebookId, [2]], sourcePath
    );

    let summary = '';
    const topics: SuggestedTopic[] = [];

    if (Array.isArray(result)) {
      // Structure: result = [[ [summary_string], [[[q1,p1],[q2,p2],...]] ]]
      // The outer result[0] is the notebook info wrapper
      const info = result[0];

      if (Array.isArray(info)) {
        // Summary at info[0][0]
        if (Array.isArray(info[0]) && typeof info[0][0] === 'string') {
          summary = info[0][0];
        } else if (typeof info[0] === 'string') {
          summary = info[0];
        }

        // Topics at info[1][0] — array of [question, prompt] pairs
        if (Array.isArray(info[1])) {
          const topicsWrapper = info[1];
          const topicsData = Array.isArray(topicsWrapper[0]) ? topicsWrapper[0] : topicsWrapper;
          for (const topic of topicsData) {
            if (Array.isArray(topic) && topic.length >= 2) {
              topics.push({
                question: String(topic[0]),
                prompt: String(topic[1]),
              });
            }
          }
        }
      }
    }

    return toolJsonResponse({
      summary,
      suggestedTopics: topics,
    });
  });
}
