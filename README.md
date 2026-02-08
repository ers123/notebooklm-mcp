# notebooklm-mcp

A secure MCP (Model Context Protocol) server for Google NotebookLM. Enables AI assistants to interact with NotebookLM notebooks — manage notebooks, query sources, create audio/video/reports, run research, and more.

**v2** uses direct HTTP API calls (no browser automation at runtime), making it significantly faster than v1 while maintaining all security hardening.

## Security

| Issue in existing MCPs | Our fix |
|---|---|
| Plaintext cookie storage | AES-256-GCM encrypted, key in macOS Keychain |
| No file permissions | `0o700` dirs, `0o600` files, verified on read |
| `--no-sandbox` Chrome | Sandbox enabled; `--no-sandbox` in blocklist |
| Remote debug port exposed | `--remote-debugging-port` in blocklist |
| Stored Google password | Manual login only — no credential storage |
| No URL validation | All URLs validated against `notebooklm.google.com` |
| Prompt injection via DOM | Response sanitizer strips zero-width chars, flags injection patterns |
| All cookies stored | Only `.google.com` + `notebooklm.google.com` persisted |
| `exec()` for shell commands | `execFile()` to prevent shell injection |

## Tools (35)

### Authentication (3)
| Tool | Description |
|---|---|
| `setup_auth` | Interactive login (headful browser, one-time setup) |
| `check_auth` | Validate auth status |
| `clear_auth` | Clear all stored auth data |

### Notebook Management (7)
| Tool | Description |
|---|---|
| `notebook_list` | List all notebooks in your account |
| `notebook_create` | Create a new notebook |
| `notebook_get` | Get notebook details including sources |
| `notebook_describe` | Get AI-generated summary and suggested topics |
| `notebook_rename` | Rename a notebook |
| `notebook_delete` | Delete a notebook (requires confirm=true) |
| `chat_configure` | Configure AI chat settings (goal, response length, custom prompt) |

### Source Management (8)
| Tool | Description |
|---|---|
| `source_add_url` | Add a URL or YouTube link as source |
| `source_add_text` | Add text content as source |
| `source_add_drive` | Add a Google Drive document as source |
| `source_describe` | Get AI-generated source summary |
| `source_get_content` | Get original text content of a source |
| `source_list_drive` | List Drive sources with sync status |
| `source_sync_drive` | Sync a Drive source to latest version |
| `source_delete` | Delete a source (requires confirm=true) |

### AI Query (1)
| Tool | Description |
|---|---|
| `notebook_query` | Ask questions about notebook sources (supports follow-ups) |

### Research (3)
| Tool | Description |
|---|---|
| `research_start` | Start web research (fast or deep mode) |
| `research_status` | Check research task progress |
| `research_import` | Import research results as notebook source |

### Studio Content (10)
| Tool | Description |
|---|---|
| `audio_create` | Generate audio podcast (format, length, language, focus) |
| `video_create` | Generate video overview (visual style, language, focus) |
| `report_create` | Generate report (briefing doc, study guide, FAQ, timeline, blog) |
| `flashcards_create` | Generate flashcards (difficulty) |
| `quiz_create` | Generate quiz (question count, difficulty) |
| `infographic_create` | Generate infographic (orientation, detail level) |
| `slide_deck_create` | Generate slide deck (format, length) |
| `data_table_create` | Generate data table |
| `studio_status` | Check generation status of any studio artifact |
| `studio_delete` | Delete a studio artifact (requires confirm=true) |

### Mind Map (3)
| Tool | Description |
|---|---|
| `mind_map_create` | Generate a mind map from sources (synchronous, returns immediately) |
| `mind_map_list` | List all mind maps in a notebook |
| `mind_map_delete` | Delete a mind map (requires confirm=true) |

## Requirements

- Node.js 18+
- macOS (uses Keychain for key storage)
- Google account with NotebookLM access

## Installation

```bash
git clone https://github.com/ers123/notebooklm-mcp.git
cd notebooklm-mcp
npm install
npm run build
npx patchright install chromium   # needed for one-time setup_auth only
```

## Configuration

### Claude Code

Add to `~/.claude/mcp_config.json`:

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "node",
      "args": ["/path/to/notebooklm-mcp/dist/index.js"]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "node",
      "args": ["/path/to/notebooklm-mcp/dist/index.js"]
    }
  }
}
```

### Any MCP Client (stdio)

```bash
node /path/to/notebooklm-mcp/dist/index.js
```

## Usage

### First-time setup

1. Connect the MCP server to your AI assistant
2. Run `setup_auth` — a browser window opens
3. Sign in to your Google account manually
4. The browser closes automatically after successful login
5. Cookies are encrypted and stored securely
6. All subsequent API calls use HTTP directly (no browser needed)

### Example workflows

```
# List your notebooks
Use notebook_list

# Create a notebook and add sources
Use notebook_create with title "AI Research"
Use source_add_url with notebookId "..." and url "https://example.com/paper.pdf"
Use source_add_text with notebookId "..." and title "Notes" and content "..."

# Query your notebook
Use notebook_query with notebookId "..." and question "What are the key findings?"
Use notebook_query with notebookId "..." and question "Tell me more" and followUp true

# Generate content
Use audio_create with notebookId "..." and format "conversation" and length "medium"
Use report_create with notebookId "..." and reportFormat "briefing_doc"
Use studio_status with notebookId "..." and artifactId "..." to check progress

# Run web research
Use research_start with notebookId "..." and query "latest AI developments" and mode "deep"
Use research_status with notebookId "..." and taskId "..." to check progress
Use research_import with notebookId "..." and taskId "..." to add results as source
```

## Architecture

```
src/
├── index.ts                    # Entry point + stdio transport
├── server.ts                   # 35 MCP tools registered
├── config.ts                   # Constants, API endpoints, timeouts
├── types.ts                    # Shared interfaces
├── errors.ts                   # Error class hierarchy
├── api/                        # HTTP API layer (v2 core)
│   ├── rpc-client.ts           # batchexecute RPC client
│   ├── query-client.ts         # Streaming query client
│   ├── response-parser.ts      # Anti-XSSI removal + chunk parsing
│   └── constants.ts            # RPC IDs + code mappings
├── security/                   # Keychain, AES-256-GCM, file perms, URL validation, sanitizer
├── auth/                       # Manual login flow, encrypted cookie store
├── browser/                    # Patchright launcher (setup_auth only)
└── tools/                      # 35 MCP tool handlers
    ├── notebook/               # list, create, get, describe, rename, delete, chat-configure
    ├── source/                 # add-url, add-text, add-drive, describe, get-content, list-drive, sync-drive, delete
    ├── query/                  # notebook-query (AI Q&A with follow-ups)
    ├── research/               # start, status, import
    ├── studio/                 # audio, video, report, flashcards, quiz, infographic, slide-deck, data-table, mind-map, status, delete
    └── auth-tools/             # setup, check, clear auth
```

## Development

```bash
npm run dev          # Run with tsx (hot reload)
npm run build        # Compile TypeScript
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
```

## Dependencies

Only 2 runtime dependencies:

- `@modelcontextprotocol/sdk` — MCP server framework
- `zod` — Input validation

Optional:
- `patchright` — Browser automation (only needed for `setup_auth`)

No native modules. Encryption via Node.js built-in `crypto`. Keychain via `child_process.execFile`.

## Acknowledgments

The NotebookLM internal API structure (RPC IDs, parameter formats, response schemas) was informed by community reverse-engineering efforts, including [wonseokjung/notebooklm-mcp](https://github.com/wonseokjung/notebooklm-mcp). All implementation code is original.

## License

MIT
