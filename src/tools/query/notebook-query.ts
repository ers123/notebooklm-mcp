import { withErrorHandling, toolJsonResponse } from '../index.js';
import { NotebookQuerySchema } from '../schemas.js';
import { QueryClient } from '../../api/query-client.js';
import type { ToolResponse } from '../../types.js';

export function createNotebookQueryHandler(queryClient: QueryClient) {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId, question, followUp } = NotebookQuerySchema.parse(args);

    const result = await queryClient.query(notebookId, question, followUp);

    return toolJsonResponse({
      answer: result.answer,
      sources: result.sources,
      ...(result.warnings.length > 0 && { warnings: result.warnings }),
    });
  });
}
