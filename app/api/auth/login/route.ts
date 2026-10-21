import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { bad, readJson } from '@/lib/api';
import { startSession } from '@/lib/auth';

export async function POST(req: Request) {
  const b = await readJson(req);
  const id = String(b.identifier ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  if (!id || !password) return bad('Enter your username/email and password.');

  const user = await prisma.user.findFirst({ where: { OR: [{ username: id }, { email: id }] } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return bad('Wrong username/email or password.', 401);
  }
  if (user.banned) return bad('This account has been suspended.', 403);

  await startSession(user.id, user.role);
  return NextResponse.json({ ok: true });
}
