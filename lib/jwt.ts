// Edge-safe session token helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'vk_session';
export type Role = 'USER' | 'ADMIN';
export type Session = { uid: string; role: Role };

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET must be set and at least 32 characters long');
  return new TextEncoder().encode(s);
}

export async function signSession(s: Session) {
  return new SignJWT({ role: s.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.uid)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key());
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.sub) return null;
    return { uid: payload.sub, role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER' };
  } catch {
    return null;
  }
}
