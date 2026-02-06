import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { withErrorHandling, toolJsonResponse } from '../index.js';
import { SearchNotebooksSchema } from '../schemas.js';
import { LIBRARY_FILE } from '../../config.js';
import type { NotebookLibrary, ToolResponse } from '../../types.js';

export function createSearchNotebooksHandler() {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { query } = SearchNotebooksSchema.parse(args);

    if (!existsSync(LIBRARY_FILE)) {
      return toolJsonResponse({ results: [] });
    }

    const raw = await readFile(LIBRARY_FILE, 'utf8');
    const library: NotebookLibrary = JSON.parse(raw);

    const lowerQuery = query.toLowerCase();
    const results = library.notebooks.filter(n =>
      n.name.toLowerCase().includes(lowerQuery) ||
      n.description.toLowerCase().includes(lowerQuery) ||
      n.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );

    return toolJsonResponse({
      results: results.map(n => ({
        id: n.id,
        name: n.name,
        tags: n.tags,
        description: n.description,
        addedAt: n.addedAt,
      })),
      total: results.length,
    });
  });
}
