import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { EncryptedData } from '../types.js';
import { SecurityError } from '../errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}

export function encrypt(plaintext: string, hexKey: string): EncryptedData {
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new SecurityError('Invalid encryption key length');
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return {
    version: 1,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext,
  };
}

export function decrypt(data: EncryptedData, hexKey: string): string {
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new SecurityError('Invalid encryption key length');
  }

  try {
    const iv = Buffer.from(data.iv, 'base64');
    const authTag = Buffer.from(data.authTag, 'base64');
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(data.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
  } catch (error) {
    throw new SecurityError('Decryption failed — data may be corrupted or key may be wrong', error instanceof Error ? error : undefined);
  }
}
