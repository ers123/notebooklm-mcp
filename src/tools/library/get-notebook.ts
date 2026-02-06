import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { withErrorHandling, toolJsonResponse } from '../index.js';
import { GetNotebookSchema } from '../schemas.js';
import { LIBRARY_FILE } from '../../config.js';
import type { NotebookLibrary, ToolResponse } from '../../types.js';
import { ValidationError } from '../../errors.js';

export function createGetNotebookHandler() {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId } = GetNotebookSchema.parse(args);

    if (!existsSync(LIBRARY_FILE)) {
      throw new ValidationError('No notebooks found. Library is empty.');
    }

    const raw = await readFile(LIBRARY_FILE, 'utf8');
    const library: NotebookLibrary = JSON.parse(raw);

    const notebook = library.notebooks.find(n => n.id === notebookId);
    if (!notebook) {
      throw new ValidationError(`Notebook not found: ${notebookId}`);
    }

    return toolJsonResponse(notebook);
  });
}
