import { ALLOWED_DOMAINS, BASE_URL } from '../config.js';
import { ValidationError } from '../errors.js';

export function validateUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new ValidationError('URL must be a non-empty string');
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new ValidationError(`URL must use HTTPS: ${url}`);
  }

  if (!isAllowedDomain(parsed.hostname)) {
    throw new ValidationError(`Domain not allowed: ${parsed.hostname}. Only ${ALLOWED_DOMAINS.join(', ')} permitted.`);
  }
}

export function isAllowedDomain(hostname: string): boolean {
  return ALLOWED_DOMAINS.some(domain => hostname === domain);
}

export function validateNotebookUrl(url: string): string {
  validateUrl(url);
  if (!url.startsWith(BASE_URL)) {
    throw new ValidationError(`URL must start with ${BASE_URL}`);
  }
  return url;
}
