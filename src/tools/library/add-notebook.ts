import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { withErrorHandling, toolJsonResponse } from '../index.js';
import { AddNotebookSchema } from '../schemas.js';
import { validateNotebookUrl } from '../../security/url-validator.js';
import { ensureSecureDirectory, writeSecureFile } from '../../security/file-permissions.js';
import { DATA_DIR, LIBRARY_FILE } from '../../config.js';
import type { Notebook, NotebookLibrary, ToolResponse } from '../../types.js';

export function createAddNotebookHandler() {
  return withErrorHandling(async (args: Record<string, unknown>): Promise<ToolResponse> => {
    const { url, name, tags, description } = AddNotebookSchema.parse(args);

    // Validate URL
    validateNotebookUrl(url);

    // Extract notebook ID from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const notebookUrlId = pathParts[pathParts.length - 1] || randomUUID();

    // Load existing library
    let library: NotebookLibrary = { notebooks: [] };
    if (existsSync(LIBRARY_FILE)) {
      const raw = await readFile(LIBRARY_FILE, 'utf8');
      library = JSON.parse(raw);
    }

    // Check for duplicate URL
    if (library.notebooks.some(n => n.url === url)) {
      return toolJsonResponse({ error: 'Notebook with this URL already exists', url });
    }

    const notebook: Notebook = {
      id: notebookUrlId,
      url,
      name: name || `Notebook ${notebookUrlId.slice(0, 8)}`,
      tags: tags || [],
      description: description || '',
      addedAt: new Date().toISOString(),
    };

    library.notebooks.push(notebook);

    await ensureSecureDirectory(DATA_DIR);
    await writeSecureFile(LIBRARY_FILE, JSON.stringify(library, null, 2));

    return toolJsonResponse({ added: notebook });
  });
}
