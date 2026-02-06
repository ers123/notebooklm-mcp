import { z } from 'zod';

// Query tools
export const AskQuestionSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to query'),
  question: z.string().min(1).describe('Question to ask about the notebook sources'),
});

export const AskFollowupSchema = z.object({
  sessionId: z.string().describe('ID of the existing session to continue'),
  question: z.string().min(1).describe('Follow-up question'),
});

// Library tools
export const ListNotebooksSchema = z.object({});

export const AddNotebookSchema = z.object({
  url: z.string().url().describe('NotebookLM notebook URL'),
  name: z.string().optional().describe('Display name for the notebook'),
  tags: z.array(z.string()).optional().describe('Tags for organizing notebooks'),
  description: z.string().optional().describe('Description of the notebook'),
});

export const RemoveNotebookSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to remove'),
});

export const SelectNotebookSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to set as active'),
});

export const SearchNotebooksSchema = z.object({
  query: z.string().min(1).describe('Search query for notebooks (matches name, tags, description)'),
});

export const GetNotebookSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to get details for'),
});

// Content tools
export const GenerateAudioSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to generate audio overview for'),
});

export const GenerateSummarySchema = z.object({
  notebookId: z.string().describe('ID of the notebook to summarize'),
});

export const DescribeSourcesSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to describe sources for'),
});

// Auth tools
export const SetupAuthSchema = z.object({});

export const CheckAuthSchema = z.object({});

export const ClearAuthSchema = z.object({});

// Session tools
export const ListSessionsSchema = z.object({});

export const CloseSessionSchema = z.object({
  sessionId: z.string().describe('ID of the session to close'),
});
