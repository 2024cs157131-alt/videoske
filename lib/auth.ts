import { cookies } from 'next/headers';
import { prisma } from './db';
import { SESSION_COOKIE, signSession, verifySession, type Role } from './jwt';

export async function startSession(uid: string, role: Role) {
  const token = await signSession({ uid, role });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function endSession() {
  cookies().delete(SESSION_COOKIE);
}

/** The logged-in user, or null. Banned users are treated as logged out. */
export async function getCurrentUser() {
  const s = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!user || user.banned) return null;
  return user;
}

export function isAdult(dob: Date) {
  const eighteen = new Date(dob);
  eighteen.setFullYear(eighteen.getFullYear() + 18);
  return eighteen.getTime() <= Date.now();
}
