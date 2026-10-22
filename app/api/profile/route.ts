import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { PUBLIC_BUCKET, supabaseAdmin } from '@/lib/storage';

// Update your own profile: picture, display name, bio
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;
  const b = await readJson(req);

  const displayName = String(b.displayName ?? '').trim().slice(0, 50);
  const bio = String(b.bio ?? '').trim().slice(0, 500) || null;
  if (displayName.length < 1) return bad('Enter a display name.');

  let avatarPath = user.avatarPath;
  if (b.removeAvatar === true) avatarPath = null;
  if (typeof b.avatarPath === 'string' && b.avatarPath) {
    if (!b.avatarPath.startsWith(`${user.id}/avatar/`)) return bad('Invalid picture.');
    avatarPath = b.avatarPath;
  }
  // Remove the old picture file when it's replaced or removed
  if (user.avatarPath && user.avatarPath !== avatarPath) {
    await supabaseAdmin().storage.from(PUBLIC_BUCKET).remove([user.avatarPath]).catch(() => {});
  }

  await prisma.user.update({ where: { id: user.id }, data: { displayName, bio, avatarPath } });
  return NextResponse.json({ ok: true });
}
