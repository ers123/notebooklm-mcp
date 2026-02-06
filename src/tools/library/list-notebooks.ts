import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { withErrorHandling, toolJsonResponse } from '../index.js';
import { LIBRARY_FILE } from '../../config.js';
import type { NotebookLibrary, ToolResponse } from '../../types.js';

export function createListNotebooksHandler() {
  return withErrorHandling(async (_args: Record<string, unknown>): Promise<ToolResponse> => {
    if (!existsSync(LIBRARY_FILE)) {
      return toolJsonResponse({ notebooks: [], activeNotebookId: null });
    }

    const raw = await readFile(LIBRARY_FILE, 'utf8');
    const library: NotebookLibrary = JSON.parse(raw);

    return toolJsonResponse({
      notebooks: library.notebooks.map(n => ({
        id: n.id,
        name: n.name,
        tags: n.tags,
        description: n.description,
        sourceCount: n.sourceCount,
        addedAt: n.addedAt,
      })),
      activeNotebookId: library.activeNotebookId ?? null,
    });
  });
}
