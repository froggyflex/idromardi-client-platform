import crypto from 'crypto';

const ITERATIONS = 120000;
const KEY_LENGTH = 32;

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, ITERATIONS, KEY_LENGTH, 'sha256').toString('hex');
  return { hash, salt: actualSalt };
}