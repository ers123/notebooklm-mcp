import path from 'node:path';
import os from 'node:os';

export const DATA_DIR = path.join(os.homedir(), '.notebooklm-mcp');
export const COOKIE_FILE = path.join(DATA_DIR, 'cookies.enc');
export const LIBRARY_FILE = path.join(DATA_DIR, 'library.json');

export const KEYCHAIN_SERVICE = 'notebooklm-mcp';
export const KEYCHAIN_ACCOUNT = 'encryption-key';

export const ALLOWED_DOMAINS = ['notebooklm.google.com'] as const;
export const ALLOWED_COOKIE_DOMAINS = ['.google.com', 'google.com', 'notebooklm.google.com'] as const;
export const BASE_URL = 'https://notebooklm.google.com';

// API endpoints
export const BATCHEXECUTE_URL = `${BASE_URL}/_/NotebookLmFrontendUi/data/batchexecute`;
export const QUERY_STREAM_URL = `${BASE_URL}/_/NotebookLmFrontendUi/data/AssistantStreamService/GenerateFreeFormStreamed`;

// Timeouts
export const NAVIGATION_TIMEOUT = 30_000;
export const QUERY_TIMEOUT = 120_000;
export const RPC_TIMEOUT = 60_000;
export const SESSION_IDLE_TIMEOUT = 15 * 60 * 1000;
export const CLEANUP_INTERVAL = 5 * 60 * 1000;

export const MAX_SESSIONS = 5;

export const BLOCKED_BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--remote-debugging-port',
  '--remote-debugging-address',
] as const;

export const BROWSER_ARGS = [
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-sync',
  '--disable-translate',
  '--metrics-recording-only',
  '--no-first-run',
] as const;
