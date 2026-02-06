import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, COOKIE_FILE, ALLOWED_COOKIE_DOMAINS, KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT } from '../config.js';
import type { CookieData, EncryptedData } from '../types.js';
import { encrypt, decrypt, generateEncryptionKey } from '../security/crypto.js';
import { getKeychainKey, setKeychainKey, deleteKeychainKey } from '../security/keychain.js';
import { ensureSecureDirectory, writeSecureFile, readSecureFile } from '../security/file-permissions.js';
import { logger } from '../utils/logger.js';
import { SecurityError } from '../errors.js';

export class CookieStore {
  private async getOrCreateKey(): Promise<string> {
    let key = await getKeychainKey();
    if (!key) {
      key = generateEncryptionKey();
      await setKeychainKey(key);
      logger.info('Generated new encryption key and stored in Keychain');
    }
    return key;
  }

  async saveCookies(cookies: CookieData[]): Promise<void> {
    // Filter to allowed domains only
    const filtered = cookies.filter(cookie =>
      ALLOWED_COOKIE_DOMAINS.some(domain =>
        cookie.domain === domain || cookie.domain.endsWith(domain)
      )
    );

    if (filtered.length === 0) {
      logger.warn('No cookies matched allowed domains, nothing saved');
      return;
    }

    const key = await this.getOrCreateKey();
    const plaintext = JSON.stringify(filtered);
    const encrypted = encrypt(plaintext, key);

    await ensureSecureDirectory(DATA_DIR);
    await writeSecureFile(COOKIE_FILE, JSON.stringify(encrypted));

    logger.info(`Saved ${filtered.length} cookies (filtered from ${cookies.length})`);
  }

  async loadCookies(): Promise<CookieData[]> {
    if (!existsSync(COOKIE_FILE)) {
      return [];
    }

    const key = await getKeychainKey();
    if (!key) {
      throw new SecurityError('Encryption key not found in Keychain. Run setup_auth to re-authenticate.');
    }

    const raw = await readSecureFile(COOKIE_FILE);
    const encrypted: EncryptedData = JSON.parse(raw);
    const plaintext = decrypt(encrypted, key);
    const cookies: CookieData[] = JSON.parse(plaintext);

    // Re-validate domains on load
    return cookies.filter(cookie =>
      ALLOWED_COOKIE_DOMAINS.some(domain =>
        cookie.domain === domain || cookie.domain.endsWith(domain)
      )
    );
  }

  async clearCookies(): Promise<void> {
    const { unlink } = await import('node:fs/promises');
    try {
      await unlink(COOKIE_FILE);
    } catch {
      // File might not exist
    }
    await deleteKeychainKey();
    logger.info('Cleared all stored cookies and encryption key');
  }

  async hasCookies(): Promise<boolean> {
    return existsSync(COOKIE_FILE);
  }
}
