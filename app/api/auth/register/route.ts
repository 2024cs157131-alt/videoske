import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { bad, readJson } from '@/lib/api';
import { isAdult, startSession } from '@/lib/auth';

export async function POST(req: Request) {
  const b = await readJson(req);
  const username = String(b.username ?? '').trim().toLowerCase();
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  const displayName = (String(b.displayName ?? '').trim() || username).slice(0, 50);
  const dob = new Date(String(b.dob ?? ''));

  if (!/^[a-z0-9_]{3,20}$/.test(username)) return bad('Username must be 3–20 letters, numbers or _.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Enter a valid email address.');
  if (password.length < 8) return bad('Password must be at least 8 characters.');
  if (isNaN(dob.getTime())) return bad('Enter your date of birth.');
  if (!isAdult(dob)) return bad('You must be 18 or older to register.');
  if (b.confirmAge !== true || b.consent !== true || b.terms !== true) {
    return bad('You must confirm you are 18+, give consent and accept the terms.');
  }

  const taken = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (taken) return bad('That username or email is already registered.');

  const user = await prisma.user.create({
    data: {
      username,
      email,
      displayName,
      dob,
      consentAt: new Date(),
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  await startSession(user.id, user.role);
  return NextResponse.json({ ok: true });
}
