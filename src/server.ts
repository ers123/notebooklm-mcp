import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AuthManager } from './auth/auth-manager.js';
import { CookieStore } from './auth/cookie-store.js';
import { BrowserLauncher } from './browser/browser-launcher.js';
import { RpcClient } from './api/rpc-client.js';
import { QueryClient } from './api/query-client.js';
import {
  SetupAuthSchema,
  CheckAuthSchema,
  ClearAuthSchema,
  NotebookListSchema,
  NotebookCreateSchema,
  NotebookGetSchema,
  NotebookDescribeSchema,
  NotebookRenameSchema,
  NotebookDeleteSchema,
  ChatConfigureSchema,
  SourceAddUrlSchema,
  SourceAddTextSchema,
  SourceAddDriveSchema,
  SourceDescribeSchema,
  SourceGetContentSchema,
  SourceListDriveSchema,
  SourceSyncDriveSchema,
  SourceDeleteSchema,
  NotebookQuerySchema,
  ResearchStartSchema,
  ResearchStatusSchema,
  ResearchImportSchema,
  AudioCreateSchema,
  VideoCreateSchema,
  ReportCreateSchema,
  FlashcardsCreateSchema,
  QuizCreateSchema,
  InfographicCreateSchema,
  SlideDeckCreateSchema,
  DataTableCreateSchema,
  StudioStatusSchema,
  StudioDeleteSchema,
} from './tools/schemas.js';

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
import { logger } from './utils/logger.js';

export interface ServerComponents {
  server: McpServer;
  browserLauncher: BrowserLauncher;
  authManager: AuthManager;
  rpcClient: RpcClient;
  queryClient: QueryClient;
}

export function createServer(): ServerComponents {
  const server = new McpServer({
    name: 'notebooklm-mcp',
    version: '2.0.0',
  });

  // Initialize components
  const browserLauncher = new BrowserLauncher();
  const cookieStore = new CookieStore();
  const authManager = new AuthManager();
  const rpcClient = new RpcClient(cookieStore);
  const queryClient = new QueryClient(cookieStore);

  // Create handlers
  const setupAuth = createSetupAuthHandler(authManager, browserLauncher);
  const checkAuth = createCheckAuthHandler(authManager);
  const clearAuth = createClearAuthHandler(authManager);
  const notebookList = createNotebookListHandler(rpcClient);
  const notebookCreate = createNotebookCreateHandler(rpcClient);
  const notebookGet = createNotebookGetHandler(rpcClient);
  const notebookDescribe = createNotebookDescribeHandler(rpcClient);
  const notebookRename = createNotebookRenameHandler(rpcClient);
  const notebookDelete = createNotebookDeleteHandler(rpcClient);
  const chatConfigure = createChatConfigureHandler(rpcClient);
  const sourceAddUrl = createSourceAddUrlHandler(rpcClient);
  const sourceAddText = createSourceAddTextHandler(rpcClient);
  const sourceAddDrive = createSourceAddDriveHandler(rpcClient);
  const sourceDescribe = createSourceDescribeHandler(rpcClient);
  const sourceGetContent = createSourceGetContentHandler(rpcClient);
  const sourceListDrive = createSourceListDriveHandler(rpcClient);
  const sourceSyncDrive = createSourceSyncDriveHandler(rpcClient);
  const sourceDelete = createSourceDeleteHandler(rpcClient);
  const notebookQuery = createNotebookQueryHandler(queryClient, rpcClient);
  const researchStart = createResearchStartHandler(rpcClient);
  const researchStatus = createResearchStatusHandler(rpcClient);
  const researchImport = createResearchImportHandler(rpcClient);
  const audioCreate = createAudioCreateHandler(rpcClient);
  const videoCreate = createVideoCreateHandler(rpcClient);
  const reportCreate = createReportCreateHandler(rpcClient);
  const flashcardsCreate = createFlashcardsCreateHandler(rpcClient);
  const quizCreate = createQuizCreateHandler(rpcClient);
  const infographicCreate = createInfographicCreateHandler(rpcClient);
  const slideDeckCreate = createSlideDeckCreateHandler(rpcClient);
  const dataTableCreate = createDataTableCreateHandler(rpcClient);
  const studioStatus = createStudioStatusHandler(rpcClient);
  const studioDelete = createStudioDeleteHandler(rpcClient);

  // === Register tools (32 total) ===

  // Auth (3)
  server.tool(
    'setup_auth',
    'Open a browser for manual Google sign-in to NotebookLM. No passwords are stored.',
    SetupAuthSchema.shape,
    async (args) => setupAuth(args)
  );

  server.tool(
    'check_auth',
    'Check current authentication status and cookie validity.',
    CheckAuthSchema.shape,
    async (args) => checkAuth(args)
  );

  server.tool(
    'clear_auth',
    'Clear all stored authentication data (cookies and encryption key).',
    ClearAuthSchema.shape,
    async (args) => clearAuth(args)
  );

  // Notebook management (7)
  server.tool(
    'notebook_list',
    'List all notebooks in your NotebookLM account.',
    NotebookListSchema.shape,
    async (args) => notebookList(args)
  );

  server.tool(
    'notebook_create',
    'Create a new notebook.',
    NotebookCreateSchema.shape,
    async (args) => notebookCreate(args)
  );

  server.tool(
    'notebook_get',
    'Get detailed information about a notebook including sources.',
    NotebookGetSchema.shape,
    async (args) => notebookGet(args)
  );

  server.tool(
    'notebook_describe',
    'Get an AI-generated summary and suggested topics for a notebook.',
    NotebookDescribeSchema.shape,
    async (args) => notebookDescribe(args)
  );

  server.tool(
    'notebook_rename',
    'Rename a notebook.',
    NotebookRenameSchema.shape,
    async (args) => notebookRename(args)
  );

  server.tool(
    'notebook_delete',
    'Delete a notebook permanently. Requires confirm=true.',
    NotebookDeleteSchema.shape,
    async (args) => notebookDelete(args)
  );

  server.tool(
    'chat_configure',
    'Configure the AI chat settings for a notebook (goal, response length, custom prompt).',
    ChatConfigureSchema.shape,
    async (args) => chatConfigure(args)
  );

  // Source management (8)
  server.tool(
    'source_add_url',
    'Add a URL or YouTube link as a source to a notebook.',
    SourceAddUrlSchema.shape,
    async (args) => sourceAddUrl(args)
  );

  server.tool(
    'source_add_text',
    'Add a text source with title and content to a notebook.',
    SourceAddTextSchema.shape,
    async (args) => sourceAddText(args)
  );

  server.tool(
    'source_add_drive',
    'Add a Google Drive document as a source to a notebook.',
    SourceAddDriveSchema.shape,
    async (args) => sourceAddDrive(args)
  );

  server.tool(
    'source_describe',
    'Get an AI-generated summary of a specific source.',
    SourceDescribeSchema.shape,
    async (args) => sourceDescribe(args)
  );

  server.tool(
    'source_get_content',
    'Get the original text content of a source.',
    SourceGetContentSchema.shape,
    async (args) => sourceGetContent(args)
  );

  server.tool(
    'source_list_drive',
    'List Google Drive sources in a notebook with sync status.',
    SourceListDriveSchema.shape,
    async (args) => sourceListDrive(args)
  );

  server.tool(
    'source_sync_drive',
    'Sync a Google Drive source to get the latest version.',
    SourceSyncDriveSchema.shape,
    async (args) => sourceSyncDrive(args)
  );

  server.tool(
    'source_delete',
    'Delete a source from a notebook. Requires confirm=true.',
    SourceDeleteSchema.shape,
    async (args) => sourceDelete(args)
  );

  // AI Query (1)
  server.tool(
    'notebook_query',
    'Ask a question about notebook sources. Supports follow-up questions with followUp=true.',
    NotebookQuerySchema.shape,
    async (args) => notebookQuery(args)
  );

  // Research (3)
  server.tool(
    'research_start',
    'Start a web research task. Returns a taskId for polling status.',
    ResearchStartSchema.shape,
    async (args) => researchStart(args)
  );

  server.tool(
    'research_status',
    'Check the status of a research task.',
    ResearchStatusSchema.shape,
    async (args) => researchStatus(args)
  );

  server.tool(
    'research_import',
    'Import completed research results as a notebook source.',
    ResearchImportSchema.shape,
    async (args) => researchImport(args)
  );

  // Studio content (10)
  server.tool(
    'audio_create',
    'Generate an audio podcast from notebook sources. Customize format, length, language, and focus.',
    AudioCreateSchema.shape,
    async (args) => audioCreate(args)
  );

  server.tool(
    'video_create',
    'Generate a video overview from notebook sources. Customize visual style, language, and focus.',
    VideoCreateSchema.shape,
    async (args) => videoCreate(args)
  );

  server.tool(
    'report_create',
    'Generate a report (briefing doc, study guide, FAQ, timeline, or blog post) from notebook sources.',
    ReportCreateSchema.shape,
    async (args) => reportCreate(args)
  );

  server.tool(
    'flashcards_create',
    'Generate flashcards from notebook sources.',
    FlashcardsCreateSchema.shape,
    async (args) => flashcardsCreate(args)
  );

  server.tool(
    'quiz_create',
    'Generate a quiz from notebook sources.',
    QuizCreateSchema.shape,
    async (args) => quizCreate(args)
  );

  server.tool(
    'infographic_create',
    'Generate an infographic from notebook sources.',
    InfographicCreateSchema.shape,
    async (args) => infographicCreate(args)
  );

  server.tool(
    'slide_deck_create',
    'Generate a slide deck from notebook sources.',
    SlideDeckCreateSchema.shape,
    async (args) => slideDeckCreate(args)
  );

  server.tool(
    'data_table_create',
    'Generate a data table from notebook sources.',
    DataTableCreateSchema.shape,
    async (args) => dataTableCreate(args)
  );

  server.tool(
    'studio_status',
    'Check the generation status of a studio artifact (audio, video, report, etc.).',
    StudioStatusSchema.shape,
    async (args) => studioStatus(args)
  );

  server.tool(
    'studio_delete',
    'Delete a studio artifact. Requires confirm=true.',
    StudioDeleteSchema.shape,
    async (args) => studioDelete(args)
  );

  logger.info('Registered 32 MCP tools');

  return { server, browserLauncher, authManager, rpcClient, queryClient };
}
