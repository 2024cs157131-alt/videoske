import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { bad, readJson } from '@/lib/api';
import { isAdult, startSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { Prisma } from '@prisma/client';
import { normalizeUsername, usernameProblem } from '@/lib/usernames';

export async function POST(req: Request) {
  const b = await readJson(req);
  const username = normalizeUsername(b.username);
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  const displayName = (String(b.displayName ?? '').trim() || username).slice(0, 50);
  const dob = new Date(String(b.dob ?? ''));

  const problem = usernameProblem(username);
  if (problem) return bad(problem);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Enter a valid email address.');
  if (password.length < 8) return bad('Password must be at least 8 characters.');
  if (isNaN(dob.getTime())) return bad('Enter your date of birth.');
  if (!isAdult(dob)) return bad('You must be 18 or older to register.');
  if (b.confirmAge !== true || b.consent !== true || b.terms !== true) {
    return bad('You must confirm you are 18+, give consent and accept the terms.');
  }

  const refName = String(b.ref ?? '').trim().toLowerCase();
  const referrer =
    refName && refName !== username
      ? await prisma.user.findFirst({ where: { username: refName, banned: false, managedByAdmin: false } })
      : null;

  const taken = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (taken) return bad(taken.username === username ? `@${username} is already taken – choose another username.` : 'That email is already registered.');

  const user = await prisma.user
    .create({
    data: {
      username,
      email,
      displayName,
      dob,
      consentAt: new Date(),
      referredById: referrer?.id ?? null,
      passwordHash: await bcrypt.hash(password, 12),
    },
    })
    .catch((e) => {
      // Someone grabbed the same username/email a moment ago
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return null;
      throw e;
    });
  if (!user) return bad('That username or email was just taken – please choose another.');
  // Welcome gift: free viewing tokens (bonus wallet – spent first, never withdrawable)
  const bonus = parseInt((await getSettings()).welcome_bonus, 10) || 0;
  if (bonus > 0) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { bonusTokens: bonus } }),
      prisma.ledgerEntry.create({
        data: { userId: user.id, type: 'WELCOME_BONUS', tokens: bonus, note: `Welcome gift: ${bonus} free tokens for viewing` },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          type: 'WELCOME',
          text: `🎁 Welcome to Vidaake! You’ve received ${bonus} free tokens (KSh ${bonus}) to unlock premium videos and posts.`,
          link: '/wallet',
        },
      }),
    ]);
  }
  await startSession(user.id, user.role);
  return NextResponse.json({ ok: true });
}
