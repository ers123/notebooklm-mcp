#!/usr/bin/env node
/**
 * CLI entry point for NotebookLM tools.
 * Usage: node dist/cli.js <tool_name> [json_args]
 * Example: node dist/cli.js notebook_list
 * Example: node dist/cli.js notebook_get '{"notebookId":"abc-123"}'
 */

import { CookieStore } from './auth/cookie-store.js';
import { AuthManager } from './auth/auth-manager.js';
import { RpcClient } from './api/rpc-client.js';
import { QueryClient } from './api/query-client.js';
import { BrowserLauncher } from './browser/browser-launcher.js';

// Tool handler factories
import { createSetupAuthHandler } from './tools/auth-tools/setup-auth.js';
import { createCheckAuthHandler } from './tools/auth-tools/check-auth.js';
import { createClearAuthHandler } from './tools/auth-tools/clear-auth.js';
import { createNotebookListHandler } from './tools/notebook/notebook-list.js';
import { createNotebookCreateHandler } from './tools/notebook/notebook-create.js';
import { createNotebookGetHandler } from './tools/notebook/notebook-get.js';
import { createNotebookDescribeHandler } from './tools/notebook/notebook-describe.js';
import { createNotebookRenameHandler } from './tools/notebook/notebook-rename.js';
import { createNotebookDeleteHandler } from './tools/notebook/notebook-delete.js';
import { createChatConfigureHandler } from './tools/notebook/chat-configure.js';
import { createSourceAddUrlHandler } from './tools/source/source-add-url.js';
import { createSourceAddTextHandler } from './tools/source/source-add-text.js';
import { createSourceAddDriveHandler } from './tools/source/source-add-drive.js';
import { createSourceDescribeHandler } from './tools/source/source-describe.js';
import { createSourceGetContentHandler } from './tools/source/source-get-content.js';
import { createSourceListDriveHandler } from './tools/source/source-list-drive.js';
import { createSourceSyncDriveHandler } from './tools/source/source-sync-drive.js';
import { createSourceDeleteHandler } from './tools/source/source-delete.js';
import { createNotebookQueryHandler } from './tools/query/notebook-query.js';
import { createResearchStartHandler } from './tools/research/research-start.js';
import { createResearchStatusHandler } from './tools/research/research-status.js';
import { createResearchImportHandler } from './tools/research/research-import.js';
import { createAudioCreateHandler } from './tools/studio/audio-create.js';
import { createVideoCreateHandler } from './tools/studio/video-create.js';
import { createReportCreateHandler } from './tools/studio/report-create.js';
import { createFlashcardsCreateHandler } from './tools/studio/flashcards-create.js';
import { createQuizCreateHandler } from './tools/studio/quiz-create.js';
import { createInfographicCreateHandler } from './tools/studio/infographic-create.js';
import { createSlideDeckCreateHandler } from './tools/studio/slide-deck-create.js';
import { createDataTableCreateHandler } from './tools/studio/data-table-create.js';
import { createStudioStatusHandler } from './tools/studio/studio-status.js';
import { createStudioDeleteHandler } from './tools/studio/studio-delete.js';
import { createMindMapCreateHandler } from './tools/studio/mind-map-create.js';
import { createMindMapListHandler } from './tools/studio/mind-map-list.js';
import { createMindMapDeleteHandler } from './tools/studio/mind-map-delete.js';

type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;

function buildToolMap(): Record<string, ToolHandler> {
  const cookieStore = new CookieStore();
  const authManager = new AuthManager();
  const browserLauncher = new BrowserLauncher();
  const rpcClient = new RpcClient(cookieStore);
  const queryClient = new QueryClient(cookieStore);

  return {
    setup_auth: createSetupAuthHandler(authManager, browserLauncher),
    check_auth: createCheckAuthHandler(authManager),
    clear_auth: createClearAuthHandler(authManager),
    notebook_list: createNotebookListHandler(rpcClient),
    notebook_create: createNotebookCreateHandler(rpcClient),
    notebook_get: createNotebookGetHandler(rpcClient),
    notebook_describe: createNotebookDescribeHandler(rpcClient),
    notebook_rename: createNotebookRenameHandler(rpcClient),
    notebook_delete: createNotebookDeleteHandler(rpcClient),
    chat_configure: createChatConfigureHandler(rpcClient),
    source_add_url: createSourceAddUrlHandler(rpcClient),
    source_add_text: createSourceAddTextHandler(rpcClient),
    source_add_drive: createSourceAddDriveHandler(rpcClient),
    source_describe: createSourceDescribeHandler(rpcClient),
    source_get_content: createSourceGetContentHandler(rpcClient),
    source_list_drive: createSourceListDriveHandler(rpcClient),
    source_sync_drive: createSourceSyncDriveHandler(rpcClient),
    source_delete: createSourceDeleteHandler(rpcClient),
    notebook_query: createNotebookQueryHandler(queryClient, rpcClient),
    research_start: createResearchStartHandler(rpcClient),
    research_status: createResearchStatusHandler(rpcClient),
    research_import: createResearchImportHandler(rpcClient),
    audio_create: createAudioCreateHandler(rpcClient),
    video_create: createVideoCreateHandler(rpcClient),
    report_create: createReportCreateHandler(rpcClient),
    flashcards_create: createFlashcardsCreateHandler(rpcClient),
    quiz_create: createQuizCreateHandler(rpcClient),
    infographic_create: createInfographicCreateHandler(rpcClient),
    slide_deck_create: createSlideDeckCreateHandler(rpcClient),
    data_table_create: createDataTableCreateHandler(rpcClient),
    studio_status: createStudioStatusHandler(rpcClient),
    studio_delete: createStudioDeleteHandler(rpcClient),
    mind_map_create: createMindMapCreateHandler(rpcClient),
    mind_map_list: createMindMapListHandler(rpcClient),
    mind_map_delete: createMindMapDeleteHandler(rpcClient),
  };
}

async function main(): Promise<void> {
  const [toolName, argsJson] = process.argv.slice(2);

  if (!toolName || toolName === '--help' || toolName === '-h') {
    const tools = Object.keys(buildToolMap());
    console.log(JSON.stringify({ availableTools: tools, usage: 'node dist/cli.js <tool_name> [json_args]' }, null, 2));
    process.exit(0);
  }

  if (toolName === '--list') {
    const tools = Object.keys(buildToolMap());
    console.log(JSON.stringify(tools));
    process.exit(0);
  }

  const toolMap = buildToolMap();
  const handler = toolMap[toolName];

  if (!handler) {
    console.error(JSON.stringify({ error: `Unknown tool: ${toolName}`, availableTools: Object.keys(toolMap) }));
    process.exit(1);
  }

  const args: Record<string, unknown> = argsJson ? JSON.parse(argsJson) : {};
  const result = await handler(args);

  // Extract the text content from the MCP response format
  const text = result.content?.[0]?.text ?? '';

  // Try to parse as JSON for clean output, fall back to raw text
  try {
    const parsed = JSON.parse(text);
    console.log(JSON.stringify(parsed, null, 2));
  } catch {
    console.log(text);
  }

  if (result.isError) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
