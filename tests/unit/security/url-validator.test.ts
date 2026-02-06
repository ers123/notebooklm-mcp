import { describe, it, expect } from 'vitest';
import { validateUrl, isAllowedDomain, validateNotebookUrl } from '../../../src/security/url-validator.js';

describe('url-validator', () => {
  describe('validateUrl', () => {
    it('should accept valid NotebookLM URL', () => {
      expect(() => validateUrl('https://notebooklm.google.com')).not.toThrow();
    });

    it('should accept NotebookLM URL with path', () => {
      expect(() => validateUrl('https://notebooklm.google.com/notebook/abc123')).not.toThrow();
    });

    it('should reject non-HTTPS URL', () => {
      expect(() => validateUrl('http://notebooklm.google.com')).toThrow('HTTPS');
    });

    it('should reject different domain', () => {
      expect(() => validateUrl('https://evil.com')).toThrow('not allowed');
    });

    it('should reject subdomain spoofing', () => {
      expect(() => validateUrl('https://notebooklm.google.com.evil.com')).toThrow('not allowed');
    });

    it('should reject path spoofing', () => {
      expect(() => validateUrl('https://evil.com/notebooklm.google.com')).toThrow('not allowed');
    });

    it('should reject empty string', () => {
      expect(() => validateUrl('')).toThrow('non-empty');
    });

    it('should reject invalid URL format', () => {
      expect(() => validateUrl('not-a-url')).toThrow('Invalid URL');
    });

    it('should reject javascript: protocol', () => {
      expect(() => validateUrl('javascript:alert(1)')).toThrow();
    });

    it('should reject data: protocol', () => {
      expect(() => validateUrl('data:text/html,<h1>hi</h1>')).toThrow();
    });

    it('should reject localhost', () => {
      expect(() => validateUrl('https://localhost')).toThrow('not allowed');
    });

    it('should reject IP addresses', () => {
      expect(() => validateUrl('https://192.168.1.1')).toThrow('not allowed');
    });
  });

  describe('isAllowedDomain', () => {
    it('should allow notebooklm.google.com', () => {
      expect(isAllowedDomain('notebooklm.google.com')).toBe(true);
    });

    it('should reject google.com', () => {
      expect(isAllowedDomain('google.com')).toBe(false);
    });

    it('should reject other subdomains', () => {
      expect(isAllowedDomain('docs.google.com')).toBe(false);
    });
  });

  describe('validateNotebookUrl', () => {
    it('should accept full NotebookLM URL', () => {
      expect(validateNotebookUrl('https://notebooklm.google.com/notebook/123')).toBe('https://notebooklm.google.com/notebook/123');
    });

    it('should reject URL that does not start with base URL', () => {
      expect(() => validateNotebookUrl('https://notebooklm.google.com.evil.com/notebook/123')).toThrow();
    });
  });
});
