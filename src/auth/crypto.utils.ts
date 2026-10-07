import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Password hashing helpers
const ALG = 'scrypt';

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `${ALG}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [alg, saltHex, hashHex] = stored.split('$');
    if (alg !== ALG || !saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(plain, salt, expected.length);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function generateToken(): string {
  return randomBytes(24).toString('hex');
}

// JWT key and TTL helpers
function normalizeMultiline(input?: string): string | undefined {
  if (!input) return undefined;

  let value = input.trim();

  // Replace escaped newlines if present.
  value = value.replace(/\\n/g, '\n');

  // If base64 without PEM headers, try to decode.
  if (!value.startsWith('-----BEGIN') && /^[A-Za-z0-9+/=\r\n]+$/.test(value)) {
    try {
      const decoded = Buffer.from(value, 'base64').toString('utf8');
      if (decoded.includes('BEGIN')) return decoded;
    } catch {
      // Ignore and fall through to the raw value.
    }
  }

  return value;
}

export function getJwtPrivateKey(): string {
  const value = normalizeMultiline(process.env.JWT_PRIVATE_KEY);
  if (!value) throw new Error('JWT_PRIVATE_KEY is not set');
  return value;
}

export function getJwtPublicKey(): string {
  const value = normalizeMultiline(process.env.JWT_PUBLIC_KEY);
  if (!value) throw new Error('JWT_PUBLIC_KEY is not set');
  return value;
}

export function getAccessTtlSeconds(): number {
  const raw = process.env.ACCESS_TOKEN_TTL || '10800'; // Default: 3 hours
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 10800;
}

export function getRefreshTtlSeconds(): number {
  const defaultTtl = 60 * 60 * 24 * 30; // 30 days
  const raw = process.env.REFRESH_TOKEN_TTL || String(defaultTtl);
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : defaultTtl;
}
