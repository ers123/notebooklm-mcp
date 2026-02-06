import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, generateEncryptionKey } from '../../../src/security/crypto.js';

describe('crypto', () => {
  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string (32 bytes)', () => {
      const key = generateEncryptionKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt a simple string', () => {
      const key = generateEncryptionKey();
      const plaintext = 'Hello, NotebookLM!';
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt JSON data', () => {
      const key = generateEncryptionKey();
      const data = JSON.stringify([{ name: 'test', value: 'cookie123', domain: '.google.com' }]);
      const encrypted = encrypt(data, key);
      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(data);
    });

    it('should encrypt and decrypt empty string', () => {
      const key = generateEncryptionKey();
      const encrypted = encrypt('', key);
      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe('');
    });

    it('should encrypt and decrypt unicode text', () => {
      const key = generateEncryptionKey();
      const plaintext = 'こんにちは世界 🌍 Ñoño';
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different IVs for same plaintext', () => {
      const key = generateEncryptionKey();
      const plaintext = 'same data';
      const encrypted1 = encrypt(plaintext, key);
      const encrypted2 = encrypt(plaintext, key);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
    });
  });

  describe('encryption format', () => {
    it('should return EncryptedData with version 1', () => {
      const key = generateEncryptionKey();
      const encrypted = encrypt('test', key);
      expect(encrypted.version).toBe(1);
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();
      expect(encrypted.ciphertext).toBeTruthy();
    });
  });

  describe('decryption failures', () => {
    it('should fail with wrong key', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      const encrypted = encrypt('secret data', key1);
      expect(() => decrypt(encrypted, key2)).toThrow();
    });

    it('should fail with tampered ciphertext', () => {
      const key = generateEncryptionKey();
      const encrypted = encrypt('secret data', key);
      // Tamper with ciphertext
      const tampered = { ...encrypted, ciphertext: encrypted.ciphertext.slice(0, -2) + 'XX' };
      expect(() => decrypt(tampered, key)).toThrow();
    });

    it('should fail with tampered auth tag', () => {
      const key = generateEncryptionKey();
      const encrypted = encrypt('secret data', key);
      const tampered = { ...encrypted, authTag: 'AAAAAAAAAAAAAAAAAAAAAA==' };
      expect(() => decrypt(tampered, key)).toThrow();
    });

    it('should throw SecurityError on invalid key length', () => {
      const encrypted = encrypt('test', generateEncryptionKey());
      expect(() => decrypt(encrypted, 'tooshort')).toThrow('Invalid encryption key length');
    });
  });
});
