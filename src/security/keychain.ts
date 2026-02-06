import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT } from '../config.js';
import { SecurityError } from '../errors.js';

const execFileAsync = promisify(execFile);

export async function getKeychainKey(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-s', KEYCHAIN_SERVICE,
      '-a', KEYCHAIN_ACCOUNT,
      '-w',
    ]);
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function setKeychainKey(key: string): Promise<void> {
  // First try to delete existing entry (ignore errors if not found)
  try {
    await execFileAsync('security', [
      'delete-generic-password',
      '-s', KEYCHAIN_SERVICE,
      '-a', KEYCHAIN_ACCOUNT,
    ]);
  } catch {
    // Key might not exist yet, that's fine
  }

  try {
    await execFileAsync('security', [
      'add-generic-password',
      '-s', KEYCHAIN_SERVICE,
      '-a', KEYCHAIN_ACCOUNT,
      '-w', key,
      '-U',
    ]);
  } catch (error) {
    throw new SecurityError('Failed to store key in macOS Keychain', error instanceof Error ? error : undefined);
  }
}

export async function deleteKeychainKey(): Promise<void> {
  try {
    await execFileAsync('security', [
      'delete-generic-password',
      '-s', KEYCHAIN_SERVICE,
      '-a', KEYCHAIN_ACCOUNT,
    ]);
  } catch {
    // Key might not exist, that's fine
  }
}
