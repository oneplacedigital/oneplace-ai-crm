/**
 * AES-256-GCM encryption for tenant API tokens at rest.
 * Format: v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>
 *
 * Keys are loaded from ENCRYPTION_KEY (32-byte base64).
 * Decryption is the ONLY operation that surfaces plaintext — never log the result.
 */
import crypto from 'crypto';
import { env } from '../config/env';

const ALG = 'aes-256-gcm';
const VERSION = 'v1';
const IV_BYTES = 12; // GCM recommended

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = Buffer.from(env.ENCRYPTION_KEY, 'base64');
  if (raw.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to 32 bytes (got ${raw.length}). Generate one with: openssl rand -base64 32`,
    );
  }
  cachedKey = raw;
  return raw;
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALG, key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decrypt(payload: string): string {
  if (!payload) return '';
  const [version, ivB64, tagB64, encB64] = payload.split(':');
  if (version !== VERSION || !ivB64 || !tagB64 || !encB64) {
    throw new Error('Invalid ciphertext payload');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const decipher = crypto.createDecipheriv(ALG, key(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

/** SHA-256 helper for Meta CAPI PII hashing (lowercase, trimmed). */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/** Normalize and hash email for Meta CAPI. */
export function hashEmail(email: string): string {
  return sha256(email.trim().toLowerCase());
}

/** Normalize and hash phone for Meta CAPI (digits only, no leading +). */
export function hashPhone(phone: string): string {
  return sha256(phone.replace(/\D/g, ''));
}

/** Constant-time string compare wrapper (returns false on length mismatch). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
