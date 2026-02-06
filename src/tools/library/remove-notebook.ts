import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { withErrorHandling, toolResponse } from '../index.js';
import { RemoveNotebookSchema } from '../schemas.js';
import { writeSecureFile } from '../../security/file-permissions.js';
import { LIBRARY_FILE } from '../../config.js';
import type { NotebookLibrary, ToolResponse } from '../../types.js';
import { ValidationError } from '../../errors.js';

export function createRemoveNotebookHandler() {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId } = RemoveNotebookSchema.parse(args);

    if (!existsSync(LIBRARY_FILE)) {
      throw new ValidationError('No notebooks found. Library is empty.');
    }

    const raw = await readFile(LIBRARY_FILE, 'utf8');
    const library: NotebookLibrary = JSON.parse(raw);

    const index = library.notebooks.findIndex(n => n.id === notebookId);
    if (index === -1) {
      throw new ValidationError(`Notebook not found: ${notebookId}`);
    }

    const removed = library.notebooks.splice(index, 1)[0];

    // Clear active notebook if it was the removed one
    if (library.activeNotebookId === notebookId) {
      library.activeNotebookId = undefined;
    }

    await writeSecureFile(LIBRARY_FILE, JSON.stringify(library, null, 2));

    return toolResponse(`Removed notebook: ${removed.name} (${notebookId})`);
  });
}
