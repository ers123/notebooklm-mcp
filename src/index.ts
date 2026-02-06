import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  logger.info('Starting NotebookLM MCP server...');

  const { server, browserLauncher, sessionManager } = createServer();

  // Start session cleanup timer
  sessionManager.startCleanupTimer();

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — shutting down gracefully`);

    try {
      await sessionManager.closeAll();
      await browserLauncher.close();
      logger.info('Shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });

    try {
      await sessionManager.closeAll();
      await browserLauncher.close();
    } catch {
      // Best effort cleanup
    }

    process.exit(1);
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('NotebookLM MCP server started — listening on stdio');
  logger.info('Available tools: ask_question, ask_followup, list_notebooks, add_notebook, remove_notebook, select_notebook, search_notebooks, get_notebook, generate_audio, generate_summary, describe_sources, setup_auth, check_auth, clear_auth, list_sessions, close_session');
}

main().catch((error) => {
  logger.error('Fatal error starting server', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
