import { SanitizeResult } from '../types.js';

// Zero-width and invisible characters to strip
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064\u2066\u2067\u2068\u2069\u206A\u206B\u206C\u206D\u206E\u206F]/g;

// Common prompt injection patterns (case-insensitive)
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?prior\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?previous/i,
  /you\s+are\s+now\s+(?:a|an)\s+/i,
  /new\s+system\s+prompt/i,
  /\bSYSTEM\s*:/i,
  /\bASSISTANT\s*:/i,
  /\bUSER\s*:/i,
  /\[INST\]/i,
  /<<SYS>>/i,
  /<\|im_start\|>/i,
  /\bact\s+as\s+(?:a|an|if)\b/i,
  /\bpretend\s+(?:you(?:'re|\s+are)\s+)/i,
  /\brole\s*:\s*system\b/i,
];

export function sanitizeResponse(text: string): SanitizeResult {
  if (!text) {
    return { clean: '', warnings: [] };
  }

  const warnings: string[] = [];

  // Strip zero-width characters
  let clean = text.replace(ZERO_WIDTH_CHARS, '');

  if (clean.length !== text.length) {
    warnings.push(`Stripped ${text.length - clean.length} invisible characters from response`);
  }

  // Check for injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(clean)) {
      warnings.push(`Potential prompt injection detected: pattern "${pattern.source}" matched`);
    }
  }

  // Trim excessive whitespace
  clean = clean.replace(/\n{4,}/g, '\n\n\n');

  return { clean, warnings };
}

export function hasInjectionWarnings(result: SanitizeResult): boolean {
  return result.warnings.some(w => w.includes('injection'));
}
