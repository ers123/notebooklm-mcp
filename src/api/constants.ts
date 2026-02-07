// RPC IDs for NotebookLM batchexecute API
export const RPC_IDS = {
  // Notebook management
  NOTEBOOK_LIST: 'wXbhsf',
  NOTEBOOK_CREATE: 'CCqFvf',
  NOTEBOOK_GET: 'rLM1Ne',
  NOTEBOOK_UPDATE: 's0tc2d',    // rename + chat_configure
  NOTEBOOK_DELETE: 'WWINqb',
  NOTEBOOK_DESCRIBE: 'VfAZjd',

  // Source management
  SOURCE_ADD: 'izAoDd',
  SOURCE_GET_CONTENT: 'hizoJc',
  SOURCE_LIST_DRIVE: 'yR9Yof',
  SOURCE_SYNC_DRIVE: 'FLmJqe',
  SOURCE_DELETE: 'tGMBJ',
  SOURCE_DESCRIBE: 'tr032e',

  // Research
  RESEARCH_START_FAST: 'Ljjv0c',
  RESEARCH_START_DEEP: 'QA9ei',
  RESEARCH_STATUS: 'e3bVqc',
  RESEARCH_IMPORT: 'LBwxtb',

  // Studio content
  STUDIO_CREATE: 'R7cb6c',
  STUDIO_STATUS: 'gArtLc',
  STUDIO_DELETE: 'V5N4be',

  // Reserved
  RESERVED_1: 'yyryJe',
  RESERVED_2: 'CYK0Xb',
  RESERVED_3: 'cFji9',
} as const;

// Studio content type codes
export const STUDIO_TYPES = {
  AUDIO: 1,
  VIDEO: 15,
  BRIEFING_DOC: 2,
  STUDY_GUIDE: 3,
  FAQ: 4,
  TIMELINE: 5,
  FLASHCARDS: 11,
  QUIZ: 12,
  INFOGRAPHIC: 16,
  SLIDE_DECK: 17,
  DATA_TABLE: 18,
  BLOG_POST: 19,
} as const;

// Audio format codes
export const AUDIO_FORMATS = {
  CONVERSATION: 1,    // Two-host conversation (default)
  SINGLE_HOST: 2,     // Single host narration
} as const;

// Audio length codes
export const AUDIO_LENGTHS = {
  SHORT: 1,     // ~5 min
  MEDIUM: 2,    // ~10 min (default)
  LONG: 3,      // ~20 min
} as const;

// Video visual style codes
export const VIDEO_STYLES = {
  ABSTRACT: 1,
  COLLAGE: 2,
  CORPORATE: 3,
  CINEMATIC: 4,
  DOCUMENTARY: 5,
  EDITORIAL: 6,
  ILLUSTRATED: 7,
  MODERN: 8,
  PHOTOGRAPHIC: 9,
} as const;

// Report format types
export const REPORT_FORMATS = {
  BRIEFING_DOC: 2,
  STUDY_GUIDE: 3,
  FAQ: 4,
  TIMELINE: 5,
  BLOG_POST: 19,
} as const;

// Research mode
export const RESEARCH_MODES = {
  FAST: 'fast',
  DEEP: 'deep',
} as const;

// Difficulty levels
export const DIFFICULTY_LEVELS = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
} as const;

// Infographic orientation
export const INFOGRAPHIC_ORIENTATIONS = {
  PORTRAIT: 1,
  LANDSCAPE: 2,
} as const;

// Detail level
export const DETAIL_LEVELS = {
  BRIEF: 1,
  STANDARD: 2,
  DETAILED: 3,
} as const;

// Slide deck format
export const SLIDE_DECK_FORMATS = {
  STANDARD: 1,
  DETAILED: 2,
} as const;

// Slide deck length
export const SLIDE_DECK_LENGTHS = {
  SHORT: 1,    // ~5 slides
  MEDIUM: 2,   // ~10 slides
  LONG: 3,     // ~15 slides
} as const;

// Source type codes for source_add
export const SOURCE_TYPES = {
  URL: 6,
  TEXT: 14,
  DRIVE: 12,
  YOUTUBE: 6,
} as const;

// Chat goal types
export const CHAT_GOALS = {
  DEFAULT: null,
  LEARN: 1,
  CREATE: 2,
  ANALYZE: 3,
} as const;

// Response length types
export const RESPONSE_LENGTHS = {
  SHORT: 1,
  MEDIUM: 2,
  LONG: 3,
} as const;

// Helper to map string keys to numeric codes
export class CodeMapper {
  static studioType(name: string): number {
    const key = name.toUpperCase().replace(/[\s-]/g, '_') as keyof typeof STUDIO_TYPES;
    const code = STUDIO_TYPES[key];
    if (code === undefined) {
      throw new Error(`Unknown studio type: ${name}. Valid: ${Object.keys(STUDIO_TYPES).join(', ')}`);
    }
    return code;
  }

  static audioFormat(name: string): number {
    const key = name.toUpperCase().replace(/[\s-]/g, '_') as keyof typeof AUDIO_FORMATS;
    const code = AUDIO_FORMATS[key];
    if (code === undefined) {
      throw new Error(`Unknown audio format: ${name}. Valid: ${Object.keys(AUDIO_FORMATS).join(', ')}`);
    }
    return code;
  }

  static audioLength(name: string): number {
    const key = name.toUpperCase() as keyof typeof AUDIO_LENGTHS;
    const code = AUDIO_LENGTHS[key];
    if (code === undefined) {
      throw new Error(`Unknown audio length: ${name}. Valid: ${Object.keys(AUDIO_LENGTHS).join(', ')}`);
    }
    return code;
  }

  static videoStyle(name: string): number {
    const key = name.toUpperCase().replace(/[\s-]/g, '_') as keyof typeof VIDEO_STYLES;
    const code = VIDEO_STYLES[key];
    if (code === undefined) {
      throw new Error(`Unknown video style: ${name}. Valid: ${Object.keys(VIDEO_STYLES).join(', ')}`);
    }
    return code;
  }

  static reportFormat(name: string): number {
    const key = name.toUpperCase().replace(/[\s-]/g, '_') as keyof typeof REPORT_FORMATS;
    const code = REPORT_FORMATS[key];
    if (code === undefined) {
      throw new Error(`Unknown report format: ${name}. Valid: ${Object.keys(REPORT_FORMATS).join(', ')}`);
    }
    return code;
  }

  static difficulty(name: string): number {
    const key = name.toUpperCase() as keyof typeof DIFFICULTY_LEVELS;
    const code = DIFFICULTY_LEVELS[key];
    if (code === undefined) {
      throw new Error(`Unknown difficulty: ${name}. Valid: ${Object.keys(DIFFICULTY_LEVELS).join(', ')}`);
    }
    return code;
  }

  static infographicOrientation(name: string): number {
    const key = name.toUpperCase() as keyof typeof INFOGRAPHIC_ORIENTATIONS;
    const code = INFOGRAPHIC_ORIENTATIONS[key];
    if (code === undefined) {
      throw new Error(`Unknown orientation: ${name}. Valid: ${Object.keys(INFOGRAPHIC_ORIENTATIONS).join(', ')}`);
    }
    return code;
  }

  static detailLevel(name: string): number {
    const key = name.toUpperCase() as keyof typeof DETAIL_LEVELS;
    const code = DETAIL_LEVELS[key];
    if (code === undefined) {
      throw new Error(`Unknown detail level: ${name}. Valid: ${Object.keys(DETAIL_LEVELS).join(', ')}`);
    }
    return code;
  }

  static slideDeckFormat(name: string): number {
    const key = name.toUpperCase() as keyof typeof SLIDE_DECK_FORMATS;
    const code = SLIDE_DECK_FORMATS[key];
    if (code === undefined) {
      throw new Error(`Unknown slide deck format: ${name}. Valid: ${Object.keys(SLIDE_DECK_FORMATS).join(', ')}`);
    }
    return code;
  }

  static slideDeckLength(name: string): number {
    const key = name.toUpperCase() as keyof typeof SLIDE_DECK_LENGTHS;
    const code = SLIDE_DECK_LENGTHS[key];
    if (code === undefined) {
      throw new Error(`Unknown slide deck length: ${name}. Valid: ${Object.keys(SLIDE_DECK_LENGTHS).join(', ')}`);
    }
    return code;
  }

  static chatGoal(name: string | null): number | null {
    if (name === null || name === 'default') return null;
    const key = name.toUpperCase() as keyof typeof CHAT_GOALS;
    const code = CHAT_GOALS[key];
    if (code === undefined) {
      throw new Error(`Unknown chat goal: ${name}. Valid: ${Object.keys(CHAT_GOALS).join(', ')}`);
    }
    return code;
  }

  static responseLength(name: string): number {
    const key = name.toUpperCase() as keyof typeof RESPONSE_LENGTHS;
    const code = RESPONSE_LENGTHS[key];
    if (code === undefined) {
      throw new Error(`Unknown response length: ${name}. Valid: ${Object.keys(RESPONSE_LENGTHS).join(', ')}`);
    }
    return code;
  }
}
