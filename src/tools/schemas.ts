import { z } from 'zod';

// Auth tools
export const SetupAuthSchema = z.object({});
export const CheckAuthSchema = z.object({});
export const ClearAuthSchema = z.object({});

// Notebook tools
export const NotebookListSchema = z.object({});

export const NotebookCreateSchema = z.object({
  title: z.string().min(1).describe('Title for the new notebook'),
});

export const NotebookGetSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
});

export const NotebookDescribeSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to describe'),
});

export const NotebookRenameSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to rename'),
  title: z.string().min(1).describe('New title for the notebook'),
});

export const NotebookDeleteSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to delete'),
  confirm: z.boolean().describe('Must be true to confirm deletion'),
});

export const ChatConfigureSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to configure'),
  goal: z.enum(['default', 'custom', 'learning_guide']).optional().describe('AI conversation goal'),
  responseLength: z.enum(['default', 'longer', 'shorter']).optional().describe('AI response length preference'),
  customPrompt: z.string().optional().describe('Custom system prompt for the notebook AI'),
});

// Source tools
export const SourceAddUrlSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to add the source to'),
  url: z.string().url().describe('URL or YouTube link to add as source'),
});

export const SourceAddTextSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to add the source to'),
  title: z.string().min(1).describe('Title for the text source'),
  content: z.string().min(1).describe('Text content to add as source'),
});

export const SourceAddDriveSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to add the source to'),
  driveFileId: z.string().describe('Google Drive file ID'),
});

export const SourceDescribeSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  sourceId: z.string().describe('ID of the source to describe'),
});

export const SourceGetContentSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  sourceId: z.string().describe('ID of the source to get content from'),
});

export const SourceListDriveSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to list Drive sources for'),
});

export const SourceSyncDriveSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  sourceId: z.string().describe('ID of the Drive source to sync'),
});

export const SourceDeleteSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  sourceId: z.string().describe('ID of the source to delete'),
  confirm: z.boolean().describe('Must be true to confirm deletion'),
});

// Query tool
export const NotebookQuerySchema = z.object({
  notebookId: z.string().describe('ID of the notebook to query'),
  question: z.string().min(1).describe('Question to ask about the notebook sources'),
  followUp: z.boolean().optional().default(false).describe('Whether this is a follow-up to a previous question'),
});

// Research tools
export const ResearchStartSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  query: z.string().min(1).describe('Research query or topic'),
  mode: z.enum(['fast', 'deep']).optional().default('fast').describe('Research mode: fast (~2 min) or deep (~5 min)'),
});

export const ResearchStatusSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  taskId: z.string().describe('Research task ID returned by research_start'),
});

export const ResearchImportSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  taskId: z.string().describe('Research task ID to import results from'),
});

// Studio tools
export const AudioCreateSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  format: z.enum(['deep_dive', 'brief', 'critique', 'debate']).optional().default('deep_dive').describe('Audio format: deep_dive (two-host conversation), brief (overview), critique, debate'),
  length: z.enum(['short', 'medium', 'long']).optional().default('medium').describe('Audio length: short (~5min), medium (~10min), long (~20min)'),
  language: z.string().optional().describe('Language code (e.g., "en", "ko", "ja")'),
  focusPrompt: z.string().optional().describe('Custom focus prompt for the audio content'),
});

export const VideoCreateSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  format: z.enum(['deep_dive', 'brief']).optional().default('deep_dive').describe('Audio format for the video'),
  visualStyle: z.enum(['auto_select', 'classic', 'whiteboard', 'kawaii', 'anime', 'watercolor', 'retro_print', 'heritage', 'paper_craft']).optional().default('auto_select').describe('Visual style for the video'),
  language: z.string().optional().describe('Language code'),
  focusPrompt: z.string().optional().describe('Custom focus prompt for the video content'),
});

export const ReportCreateSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  reportFormat: z.enum(['briefing_doc', 'study_guide', 'faq', 'timeline', 'blog_post']).optional().default('briefing_doc').describe('Report format type'),
  customPrompt: z.string().optional().describe('Custom instructions for report generation'),
  language: z.string().optional().describe('Language code'),
});

export const FlashcardsCreateSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium').describe('Difficulty level'),
});

export const QuizCreateSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  questionCount: z.number().int().min(1).max(50).optional().default(10).describe('Number of quiz questions'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium').describe('Difficulty level'),
});

export const InfographicCreateSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional().default('portrait').describe('Infographic orientation'),
  detailLevel: z.enum(['brief', 'standard', 'detailed']).optional().default('standard').describe('Level of detail'),
  language: z.string().optional().describe('Language code'),
  focusPrompt: z.string().optional().describe('Custom focus prompt for the infographic'),
});

export const SlideDeckCreateSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  format: z.enum(['detailed_deck', 'presenter_slides']).optional().default('detailed_deck').describe('Slide deck format: detailed_deck (comprehensive) or presenter_slides (concise)'),
  length: z.enum(['short', 'default']).optional().default('default').describe('Slide deck length: short or default'),
  language: z.string().optional().describe('Language code'),
  focusPrompt: z.string().optional().describe('Custom focus prompt for the slide deck'),
});

export const DataTableCreateSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  description: z.string().optional().describe('Description of what data to extract into the table'),
  language: z.string().optional().describe('Language code'),
});

export const StudioStatusSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  artifactId: z.string().optional().describe('Specific artifact ID to check, or omit to list all artifacts'),
});

export const StudioDeleteSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  artifactId: z.string().describe('Studio artifact ID to delete'),
  confirm: z.boolean().describe('Must be true to confirm deletion'),
});

// Mind Map tools
export const MindMapCreateSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to create a mind map for'),
  title: z.string().optional().describe('Title for the mind map (auto-generated if omitted)'),
});

export const MindMapListSchema = z.object({
  notebookId: z.string().describe('ID of the notebook to list mind maps for'),
});

export const MindMapDeleteSchema = z.object({
  notebookId: z.string().describe('ID of the notebook'),
  mindMapId: z.string().describe('ID of the mind map to delete'),
  confirm: z.boolean().describe('Must be true to confirm deletion'),
});
