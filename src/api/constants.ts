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
  REPORT: 2,           // Report-type outputs (Briefing Doc, Study Guide, etc.)
  BRIEFING_DOC: 2,     // Alias for REPORT
  VIDEO: 3,
  FLASHCARDS: 4,       // Quiz also uses type 4, differentiated by options
  INFOGRAPHIC: 7,
  SLIDE_DECK: 8,
  DATA_TABLE: 9,
} as const;

// Audio format codes
export const AUDIO_FORMATS = {
  DEEP_DIVE: 1,       // Two-host deep dive conversation (default)
  BRIEF: 2,           // Single host brief overview
  CRITIQUE: 3,        // Critical analysis format
  DEBATE: 4,          // Debate format
} as const;

// Audio length codes
export const AUDIO_LENGTHS = {
  SHORT: 1,     // ~5 min
  MEDIUM: 2,    // ~10 min (default)
  LONG: 3,      // ~20 min
} as const;

// Video visual style codes
export const VIDEO_STYLES = {
  AUTO_SELECT: 1,
  CUSTOM: 2,
  CLASSIC: 3,
  WHITEBOARD: 4,
  KAWAII: 5,
  ANIME: 6,
  WATERCOLOR: 7,
  RETRO_PRINT: 8,
  HERITAGE: 9,
  PAPER_CRAFT: 10,
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
  LANDSCAPE: 1,
  PORTRAIT: 2,
  SQUARE: 3,
} as const;

// Detail level
export const DETAIL_LEVELS = {
  BRIEF: 1,
  STANDARD: 2,
  DETAILED: 3,
} as const;

// Slide deck format
export const SLIDE_DECK_FORMATS = {
  DETAILED_DECK: 1,
  PRESENTER_SLIDES: 2,
} as const;

// Slide deck length
export const SLIDE_DECK_LENGTHS = {
  SHORT: 1,
  DEFAULT: 3,
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
  DEFAULT: 1,
  CUSTOM: 2,
  LEARNING_GUIDE: 3,
} as const;

// Response length types
export const RESPONSE_LENGTHS = {
  DEFAULT: 1,
  LONGER: 4,
  SHORTER: 5,
} as const;

// Helper to map string keys to numeric codes
// Alias maps: schema-friendly names → constant keys
const AUDIO_FORMAT_ALIASES: Record<string, number> = {
  deep_dive: AUDIO_FORMATS.DEEP_DIVE,
  brief: AUDIO_FORMATS.BRIEF,
  critique: AUDIO_FORMATS.CRITIQUE,
  debate: AUDIO_FORMATS.DEBATE,
  // Legacy aliases
  conversation: AUDIO_FORMATS.DEEP_DIVE,
  single_host: AUDIO_FORMATS.BRIEF,
};

const VIDEO_STYLE_ALIASES: Record<string, number> = {
  auto_select: VIDEO_STYLES.AUTO_SELECT,
  auto: VIDEO_STYLES.AUTO_SELECT,
  custom: VIDEO_STYLES.CUSTOM,
  classic: VIDEO_STYLES.CLASSIC,
  whiteboard: VIDEO_STYLES.WHITEBOARD,
  kawaii: VIDEO_STYLES.KAWAII,
  anime: VIDEO_STYLES.ANIME,
  watercolor: VIDEO_STYLES.WATERCOLOR,
  retro_print: VIDEO_STYLES.RETRO_PRINT,
  retro: VIDEO_STYLES.RETRO_PRINT,
  heritage: VIDEO_STYLES.HERITAGE,
  paper_craft: VIDEO_STYLES.PAPER_CRAFT,
};

const SLIDE_DECK_FORMAT_ALIASES: Record<string, number> = {
  detailed_deck: SLIDE_DECK_FORMATS.DETAILED_DECK,
  presenter_slides: SLIDE_DECK_FORMATS.PRESENTER_SLIDES,
  // Legacy aliases
  standard: SLIDE_DECK_FORMATS.DETAILED_DECK,
  detailed: SLIDE_DECK_FORMATS.DETAILED_DECK,
  presenter: SLIDE_DECK_FORMATS.PRESENTER_SLIDES,
};

const SLIDE_DECK_LENGTH_ALIASES: Record<string, number> = {
  short: SLIDE_DECK_LENGTHS.SHORT,
  default: SLIDE_DECK_LENGTHS.DEFAULT,
  // Legacy aliases
  medium: SLIDE_DECK_LENGTHS.DEFAULT,
  long: SLIDE_DECK_LENGTHS.DEFAULT,
};

const CHAT_GOAL_ALIASES: Record<string, number> = {
  default: CHAT_GOALS.DEFAULT,
  custom: CHAT_GOALS.CUSTOM,
  learning_guide: CHAT_GOALS.LEARNING_GUIDE,
  // Legacy aliases
  learn: CHAT_GOALS.LEARNING_GUIDE,
  create: CHAT_GOALS.CUSTOM,
  analyze: CHAT_GOALS.LEARNING_GUIDE,
};

const RESPONSE_LENGTH_ALIASES: Record<string, number> = {
  default: RESPONSE_LENGTHS.DEFAULT,
  longer: RESPONSE_LENGTHS.LONGER,
  shorter: RESPONSE_LENGTHS.SHORTER,
  // Legacy aliases
  short: RESPONSE_LENGTHS.SHORTER,
  medium: RESPONSE_LENGTHS.DEFAULT,
  long: RESPONSE_LENGTHS.LONGER,
};

function resolveAlias(name: string, aliases: Record<string, number>, label: string): number {
  const key = name.toLowerCase().replace(/[\s-]/g, '_');
  const code = aliases[key];
  if (code === undefined) {
    throw new Error(`Unknown ${label}: ${name}. Valid: ${Object.keys(aliases).join(', ')}`);
  }
  return code;
}

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
    return resolveAlias(name, AUDIO_FORMAT_ALIASES, 'audio format');
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
    return resolveAlias(name, VIDEO_STYLE_ALIASES, 'video style');
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
    return resolveAlias(name, SLIDE_DECK_FORMAT_ALIASES, 'slide deck format');
  }

  static slideDeckLength(name: string): number {
    return resolveAlias(name, SLIDE_DECK_LENGTH_ALIASES, 'slide deck length');
  }

  static chatGoal(name: string | null): number {
    if (name === null) return CHAT_GOALS.DEFAULT;
    return resolveAlias(name, CHAT_GOAL_ALIASES, 'chat goal');
  }

  static responseLength(name: string): number {
    return resolveAlias(name, RESPONSE_LENGTH_ALIASES, 'response length');
  }
}
