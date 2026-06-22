import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'secure-warehouse-core-local-token-key-2026';

/**
 * Hash a plain text password using salted PBKDF2 (SHA-512).
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain text password against a stored PBKDF2 hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Generates a mock JWT token that is cryptographically signed using HMAC-SHA256.
 * Zero external packages required.
 */
export function generateToken(payload: { id: number; email: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const data = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours expiry
  })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${data}`)
    .digest('base64url');
    
  return `${header}.${data}.${signature}`;
}

/**
 * Decodes and verifies a signed custom token. Returns the payload or null if invalid.
 */
export function verifyToken(token: string): { id: number; email: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, data, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${data}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    
    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.warn('Custom token has expired.');
      return null;
    }
    
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role || 'staff'
    };
  } catch (error) {
    console.error('Error verifying custom token:', error);
    return null;
  }
}
