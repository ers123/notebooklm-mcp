# notebooklm-mcp

A secure MCP (Model Context Protocol) server for Google NotebookLM. Enables AI assistants to interact with NotebookLM notebooks — ask questions, manage notebooks, generate audio overviews, and more.

Built as a security-hardened alternative to existing NotebookLM integrations.

## Security

This server was designed to fix critical security issues found in existing NotebookLM MCP implementations:

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

## Tools (16)

| Tool | Description |
|---|---|
| `ask_question` | Query notebook sources with source-grounded answer |
| `ask_followup` | Continue conversation in existing session |
| `list_notebooks` | List all notebooks in local library |
| `add_notebook` | Add notebook URL with name/tags/description |
| `remove_notebook` | Remove notebook from library |
| `select_notebook` | Set active notebook |
| `search_notebooks` | Search by name/tags/description |
| `get_notebook` | Get notebook details |
| `generate_audio` | Create audio overview (paid feature) |
| `generate_summary` | Get notebook summary |
| `describe_sources` | List sources with metadata |
| `setup_auth` | Interactive login (headful browser) |
| `check_auth` | Validate auth status |
| `clear_auth` | Clear all stored auth data |
| `list_sessions` | List active browser sessions |
| `close_session` | Close a specific session |

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
npx patchright install chromium
```

## Configuration

### Google Antigravity IDE (Gemini)

Add to `~/.gemini/antigravity/mcp_config.json`:

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "node",
      "args": ["/path/to/notebooklm-mcp/dist/index.js"],
      "env": {}
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
2. Run the `setup_auth` tool — a browser window opens
3. Sign in to your Google account manually
4. The browser closes automatically after successful login
5. Cookies are encrypted and stored securely

### Querying notebooks

```
Use ask_question with notebookId "abc123" and question "What are the key findings?"
```

### Managing notebooks

```
Use add_notebook with url "https://notebooklm.google.com/notebook/abc123" and name "Research Notes"
Use list_notebooks to see all saved notebooks
Use search_notebooks with query "research" to find notebooks
```

## Architecture

```
src/
├── index.ts                    # Entry point + stdio transport
├── server.ts                   # MCP server + tool registration
├── config.ts                   # Constants, paths, timeouts
├── types.ts                    # Shared interfaces
├── errors.ts                   # Error class hierarchy
├── security/                   # Keychain, AES-256-GCM, file perms, URL validation, sanitizer
├── auth/                       # Manual login flow, encrypted cookie store
├── browser/                    # Patchright launcher, context management, page helpers
├── session/                    # Session pool (max 5, 15min timeout)
└── tools/                      # 16 MCP tool handlers
    ├── query/                  # ask_question, ask_followup
    ├── library/                # list/add/remove/select/search/get notebooks
    ├── content/                # generate_audio, generate_summary, describe_sources
    ├── auth-tools/             # setup/check/clear auth
    └── session-tools/          # list/close sessions
```

## Development

```bash
npm run dev          # Run with tsx (hot reload)
npm run build        # Compile TypeScript
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
```

## Dependencies

Only 3 runtime dependencies:

- `@modelcontextprotocol/sdk` — MCP server framework
- `patchright` — Browser automation (Playwright fork)
- `zod` — Input validation

No native modules. Encryption via Node.js built-in `crypto`. Keychain via `child_process.execFile`.

## License

MIT
