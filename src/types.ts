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

// --- v2 API types ---

export interface NotebookInfo {
  id: string;
  title: string;
  description?: string;
  sourceCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SourceInfo {
  id: string;
  title: string;
  type: string;
  url?: string;
  driveId?: string;
  addedAt?: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface QueryStreamResult {
  answer: string;
  warnings: string[];
  sources: string[];
}

export interface ResearchTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  mode: 'fast' | 'deep';
  query?: string;
  progress?: number;
  resultId?: string;
}

export interface StudioArtifact {
  id: string;
  type: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  title?: string;
  url?: string;
  createdAt?: string;
}

export interface NotebookDescribeResult {
  summary: string;
  topics: string[];
  sourceCount: number;
}

export interface ChatConfig {
  goal?: string | null;
  responseLength?: string;
  customPrompt?: string;
}

export interface DriveSourceInfo extends SourceInfo {
  driveFileId: string;
  syncedAt?: string;
  needsSync: boolean;
}
