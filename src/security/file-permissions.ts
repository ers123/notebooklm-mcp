import { mkdir, writeFile, readFile, stat, chmod } from 'node:fs/promises';
import { SecurityError } from '../errors.js';
import { logger } from '../utils/logger.js';

const DIR_PERMS = 0o700;
const FILE_PERMS = 0o600;

export async function ensureSecureDirectory(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true, mode: DIR_PERMS });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw new SecurityError(`Failed to create directory: ${dirPath}`, error instanceof Error ? error : undefined);
    }
  }
  await verifyPermissions(dirPath, DIR_PERMS);
}

export async function writeSecureFile(filePath: string, data: string): Promise<void> {
  await writeFile(filePath, data, { mode: FILE_PERMS, encoding: 'utf8' });
  await verifyPermissions(filePath, FILE_PERMS);
}

export async function readSecureFile(filePath: string): Promise<string> {
  await verifyPermissions(filePath, FILE_PERMS);
  return readFile(filePath, 'utf8');
}

async function verifyPermissions(targetPath: string, expected: number): Promise<void> {
  try {
    const stats = await stat(targetPath);
    const actual = stats.mode & 0o777;
    if (actual !== expected) {
      logger.warn(`Fixing permissions on ${targetPath}: ${actual.toString(8)} → ${expected.toString(8)}`);
      await chmod(targetPath, expected);
    }
  } catch (error) {
    throw new SecurityError(`Failed to verify permissions for: ${targetPath}`, error instanceof Error ? error : undefined);
  }
}
