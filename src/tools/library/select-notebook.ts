import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { withErrorHandling, toolJsonResponse } from '../index.js';
import { SelectNotebookSchema } from '../schemas.js';
import { writeSecureFile } from '../../security/file-permissions.js';
import { LIBRARY_FILE } from '../../config.js';
import type { NotebookLibrary, ToolResponse } from '../../types.js';
import { ValidationError } from '../../errors.js';

export function createSelectNotebookHandler() {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { notebookId } = SelectNotebookSchema.parse(args);

    if (!existsSync(LIBRARY_FILE)) {
      throw new ValidationError('No notebooks found. Add a notebook first.');
    }

    const raw = await readFile(LIBRARY_FILE, 'utf8');
    const library: NotebookLibrary = JSON.parse(raw);

    const notebook = library.notebooks.find(n => n.id === notebookId);
    if (!notebook) {
      throw new ValidationError(`Notebook not found: ${notebookId}`);
    }

    library.activeNotebookId = notebookId;
    await writeSecureFile(LIBRARY_FILE, JSON.stringify(library, null, 2));

    return toolJsonResponse({
      selected: {
        id: notebook.id,
        name: notebook.name,
        url: notebook.url,
      },
    });
  });
}
