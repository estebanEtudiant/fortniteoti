import { createHmac, createHash, randomBytes } from 'crypto';

/**
 * Hash HWID with server-side salt (HMAC-SHA256).
 * The client sends a SHA256 of machine identifiers.
 * The server adds its own salt to prevent rainbow tables.
 */
export function hashHwid(clientHwid: string, serverSalt: string): string {
  return createHmac('sha256', serverSalt).update(clientHwid).digest('hex');
}

/**
 * Generate a license key in format XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
 * Uses cryptographically secure random bytes.
 */
export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 (ambiguity)
  const segments = 5;
  const segmentLength = 5;
  const parts: string[] = [];

  for (let s = 0; s < segments; s++) {
    const bytes = randomBytes(segmentLength);
    let segment = '';
    for (let i = 0; i < segmentLength; i++) {
      segment += chars[bytes[i] % chars.length];
    }
    parts.push(segment);
  }

  return parts.join('-');
}

/**
 * Hash a refresh token for storage (SHA256).
 * Never store refresh tokens in plaintext.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a secure random token (hex string).
 */
export function generateSecureToken(byteLength: number = 32): string {
  return randomBytes(byteLength).toString('hex');
}

/**
 * Validate license key format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
 */
export function isValidKeyFormat(key: string): boolean {
  return /^[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(key);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
