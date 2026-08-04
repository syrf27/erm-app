import * as crypto from "crypto";

const SALT_LENGTH = 32;
const ITER = 10000;
const KEY_LENGTH = 64;
const ALGORITHM = "sha512";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const key = crypto
    .pbkdf2Sync(password, salt, ITER, KEY_LENGTH, ALGORITHM)
    .toString("hex");
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) {
      // Backwards compatibility: if no salt:key format, treat as plaintext (legacy)
      // This handles users created before hashing was implemented
      return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(storedHash));
    }
    const testKey = crypto
      .pbkdf2Sync(password, salt, ITER, KEY_LENGTH, ALGORITHM)
      .toString("hex");
    return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(testKey));
  } catch {
    return false;
  }
}
