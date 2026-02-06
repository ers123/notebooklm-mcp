import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AuthManager } from './auth/auth-manager.js';
import { CookieStore } from './auth/cookie-store.js';
import { BrowserLauncher } from './browser/browser-launcher.js';
import { ContextManager } from './browser/context-manager.js';
import { SessionManager } from './session/session-manager.js';
import {
  AskQuestionSchema,
  AskFollowupSchema,
  ListNotebooksSchema,
  AddNotebookSchema,
  RemoveNotebookSchema,
  SelectNotebookSchema,
  SearchNotebooksSchema,
  GetNotebookSchema,
  GenerateAudioSchema,
  GenerateSummarySchema,
  DescribeSourcesSchema,
  SetupAuthSchema,
  CheckAuthSchema,
  ClearAuthSchema,
  ListSessionsSchema,
  CloseSessionSchema,
} from './tools/schemas.js';

// Tool handler factories
import { createAskQuestionHandler } from './tools/query/ask-question.js';
import { createAskFollowupHandler } from './tools/query/ask-followup.js';
import { createListNotebooksHandler } from './tools/library/list-notebooks.js';
import { createAddNotebookHandler } from './tools/library/add-notebook.js';
import { createRemoveNotebookHandler } from './tools/library/remove-notebook.js';
import { createSelectNotebookHandler } from './tools/library/select-notebook.js';
import { createSearchNotebooksHandler } from './tools/library/search-notebooks.js';
import { createGetNotebookHandler } from './tools/library/get-notebook.js';
import { createGenerateAudioHandler } from './tools/content/generate-audio.js';
import { createGenerateSummaryHandler } from './tools/content/generate-summary.js';
import { createDescribeSourcesHandler } from './tools/content/describe-sources.js';
import { createSetupAuthHandler } from './tools/auth-tools/setup-auth.js';
import { createCheckAuthHandler } from './tools/auth-tools/check-auth.js';
import { createClearAuthHandler } from './tools/auth-tools/clear-auth.js';
import { createListSessionsHandler } from './tools/session-tools/list-sessions.js';
import { createCloseSessionHandler } from './tools/session-tools/close-session.js';
import { logger } from './utils/logger.js';

export interface ServerComponents {
  server: McpServer;
  browserLauncher: BrowserLauncher;
  contextManager: ContextManager;
  sessionManager: SessionManager;
  authManager: AuthManager;
}

export function createServer(): ServerComponents {
  const server = new McpServer({
    name: 'notebooklm-mcp',
    version: '1.0.0',
  });

  // Initialize components
  const browserLauncher = new BrowserLauncher();
  const cookieStore = new CookieStore();
  const contextManager = new ContextManager(browserLauncher, cookieStore);
  const sessionManager = new SessionManager(contextManager);
  const authManager = new AuthManager();

  // Create handlers
  const askQuestion = createAskQuestionHandler(sessionManager);
  const askFollowup = createAskFollowupHandler(sessionManager);
  const listNotebooks = createListNotebooksHandler();
  const addNotebook = createAddNotebookHandler();
  const removeNotebook = createRemoveNotebookHandler();
  const selectNotebook = createSelectNotebookHandler();
  const searchNotebooks = createSearchNotebooksHandler();
  const getNotebook = createGetNotebookHandler();
  const generateAudio = createGenerateAudioHandler(sessionManager);
  const generateSummary = createGenerateSummaryHandler(sessionManager);
  const describeSources = createDescribeSourcesHandler(sessionManager);
  const setupAuth = createSetupAuthHandler(authManager, browserLauncher);
  const checkAuth = createCheckAuthHandler(authManager);
  const clearAuth = createClearAuthHandler(authManager);
  const listSessions = createListSessionsHandler(sessionManager);
  const closeSession = createCloseSessionHandler(sessionManager);

  // Register tools
  server.tool(
    'ask_question',
    'Ask a question about notebook sources. Returns a source-grounded answer.',
    AskQuestionSchema.shape,
    async (args) => askQuestion(args)
  );

  server.tool(
    'ask_followup',
    'Continue a conversation in an existing session with a follow-up question.',
    AskFollowupSchema.shape,
    async (args) => askFollowup(args)
  );

  server.tool(
    'list_notebooks',
    'List all notebooks in the local library.',
    ListNotebooksSchema.shape,
    async (args) => listNotebooks(args)
  );

  server.tool(
    'add_notebook',
    'Add a NotebookLM notebook URL to the local library with optional name, tags, and description.',
    AddNotebookSchema.shape,
    async (args) => addNotebook(args)
  );

  server.tool(
    'remove_notebook',
    'Remove a notebook from the local library.',
    RemoveNotebookSchema.shape,
    async (args) => removeNotebook(args)
  );

  server.tool(
    'select_notebook',
    'Set a notebook as the active notebook.',
    SelectNotebookSchema.shape,
    async (args) => selectNotebook(args)
  );

  server.tool(
    'search_notebooks',
    'Search notebooks by name, tags, or description.',
    SearchNotebooksSchema.shape,
    async (args) => searchNotebooks(args)
  );

  server.tool(
    'get_notebook',
    'Get full details for a specific notebook.',
    GetNotebookSchema.shape,
    async (args) => getNotebook(args)
  );

  server.tool(
    'generate_audio',
    'Generate an audio overview for a notebook (paid feature).',
    GenerateAudioSchema.shape,
    async (args) => generateAudio(args)
  );

  server.tool(
    'generate_summary',
    'Generate a summary of all sources in a notebook.',
    GenerateSummarySchema.shape,
    async (args) => generateSummary(args)
  );

  server.tool(
    'describe_sources',
    'List all sources in a notebook with their titles and types.',
    DescribeSourcesSchema.shape,
    async (args) => describeSources(args)
  );

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

  server.tool(
    'list_sessions',
    'List all active browser sessions with their status.',
    ListSessionsSchema.shape,
    async (args) => listSessions(args)
  );

  server.tool(
    'close_session',
    'Close a specific browser session.',
    CloseSessionSchema.shape,
    async (args) => closeSession(args)
  );

  logger.info('Registered 16 MCP tools');

  return { server, browserLauncher, contextManager, sessionManager, authManager };
}
