import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  logger.info('Starting NotebookLM MCP server v2...');

  const { server, browserLauncher } = createServer();

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal} — shutting down gracefully`);

    try {
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
      await browserLauncher.close();
    } catch {
      // Best effort cleanup
    }

    process.exit(1);
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('NotebookLM MCP server v2 started — listening on stdio');
  logger.info('32 tools registered: setup_auth, check_auth, clear_auth, notebook_list, notebook_create, notebook_get, notebook_describe, notebook_rename, notebook_delete, chat_configure, source_add_url, source_add_text, source_add_drive, source_describe, source_get_content, source_list_drive, source_sync_drive, source_delete, notebook_query, research_start, research_status, research_import, audio_create, video_create, report_create, flashcards_create, quiz_create, infographic_create, slide_deck_create, data_table_create, studio_status, studio_delete');
}

main().catch((error) => {
  logger.error('Fatal error starting server', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
