import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { isAdult } from '@/lib/auth';

// Admin creates a creator profile (no login) and can then add videos to it.
export async function POST(req: Request) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);

  const username = String(b.username ?? '').trim().toLowerCase();
  const displayName = String(b.displayName ?? '').trim().slice(0, 50);
  const bio = String(b.bio ?? '').trim().slice(0, 500) || null;
  const dob = new Date(String(b.dob ?? ''));

  if (!/^[a-z0-9_]{3,20}$/.test(username)) return bad('Username must be 3–20 letters, numbers or _.');
  if (!displayName) return bad('Display name is required.');
  if (isNaN(dob.getTime()) || !isAdult(dob)) return bad('The person must be 18 or older (check date of birth).');
  if (b.consent !== true) return bad('Confirm you hold this person’s written consent and verified ID.');
  if (await prisma.user.findUnique({ where: { username } })) return bad('That username is taken.');

  const profile = await prisma.user.create({
    data: { username, displayName, bio, dob, consentAt: new Date(), managedByAdmin: true },
  });
  return NextResponse.json({ id: profile.id, username: profile.username });
}
