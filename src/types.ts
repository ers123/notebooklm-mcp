export interface Notebook {
  id: string;
  url: string;
  name: string;
  tags: string[];
  description: string;
  sourceCount?: number;
  lastModified?: string;
  addedAt: string;
}

export interface NotebookLibrary {
  notebooks: Notebook[];
  activeNotebookId?: string;
}

export interface SessionInfo {
  id: string;
  notebookId: string;
  lastActivity: number;
  createdAt: number;
}

export interface AuthState {
  isValid: boolean;
  expiresAt?: number;
  needsRefresh: boolean;
}

export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

export interface EncryptedData {
  version: 1;
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface QueryResult {
  answer: string;
  sessionId: string;
  warnings: string[];
}

export interface AudioOverview {
  status: 'generating' | 'ready' | 'failed';
  message: string;
}

export interface NotebookSummary {
  summary: string;
  sourceCount: number;
  warnings: string[];
}

export interface SourceDescription {
  title: string;
  type: string;
  addedAt?: string;
}

export interface SanitizeResult {
  clean: string;
  warnings: string[];
}

export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
