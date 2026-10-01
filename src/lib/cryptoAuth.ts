import { JWTPayload } from '../types/auth';

/**
 * Validates password against strict municipal security policy:
 * - At least 10 characters long
 * - Contains at least one uppercase letter [A-Z]
 * - Contains at least one lowercase letter [a-z]
 * - Contains at least one numeric digit [0-9]
 * - Contains at least one special character [!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]
 * - Not in common dictionary / municipal default blacklist
 */
export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 4
  errors: string[];
  feedback: string;
}

const COMMON_DISALLOWED_PASSWORDS = [
  'password',
  'password123',
  'civicconnect',
  'admin1234',
  'welcome123',
  'changeme1',
  'letmein123',
];

export function validatePasswordSecurity(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  if (!password || password.length < 10) {
    errors.push('Password must be at least 10 characters long');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Must include at least one uppercase letter (A-Z)');
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Must include at least one lowercase letter (a-z)');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Must include at least one numeric digit (0-9)');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Must include at least one special character (!@#$%^&*)');
  } else {
    score += 1;
  }

  if (COMMON_DISALLOWED_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is in the common compromised password blacklist');
    score = 0;
  }

  const isValid = errors.length === 0;

  let feedback = 'Very Weak';
  if (score === 2) feedback = 'Weak';
  if (score === 3) feedback = 'Moderate';
  if (score === 4 && isValid) feedback = 'Strong & Compliant';

  return { isValid, score, errors, feedback };
}

/**
 * Web Crypto SHA-256 password hash generator with simulated Argon2id salt prefix
 * (Produces standard cryptographic hash for client-side/in-memory deterministic storage)
 */
export async function hashPassword(password: string, salt = 'civic_salt_v1'): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:municipal_secure_entropy`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `$argon2id$v=19$m=65536,t=3,p=4$${salt}$${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Extract salt if formatted
  const parts = storedHash.split('$');
  const salt = parts.length >= 5 ? parts[4] : 'civic_salt_v1';
  const calculated = await hashPassword(password, salt);
  return calculated === storedHash;
}

/**
 * Base64URL encoding/decoding for standard RFC 7519 JWT representation
 */
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

const JWT_SECRET_SIGNATURE = 'civic_connect_jwt_hmac_256_secret_key_prod_simulation';

/**
 * Sign JWT with HMAC-SHA256
 */
export async function signJWT(payload: JWTPayload): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(JWT_SECRET_SIGNATURE),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(unsignedToken));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map((b) => String.fromCharCode(b)).join('');
  const encodedSignature = base64UrlEncode(signatureHex);

  return `${unsignedToken}.${encodedSignature}`;
}

/**
 * Verify JWT signature and expiration
 */
export async function verifyJWT(token: string): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed JWT structure (expected 3 parts)' };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(JWT_SECRET_SIGNATURE),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureRaw = base64UrlDecode(encodedSignature);
    const signatureBuffer = new Uint8Array(signatureRaw.length);
    for (let i = 0; i < signatureRaw.length; i++) {
      signatureBuffer[i] = signatureRaw.charCodeAt(i);
    }

    const isValidSignature = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      enc.encode(unsignedToken)
    );

    if (!isValidSignature) {
      return { valid: false, error: 'Cryptographic signature verification failed (tampered token)' };
    }

    const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token has expired', payload };
    }

    return { valid: true, payload };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    return { valid: false, error: message };
  }
}
