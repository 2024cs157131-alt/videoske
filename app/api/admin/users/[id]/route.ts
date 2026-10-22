import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Admin actions on a user: { banned: true|false } and/or { verified: true|false }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);

  if (typeof b.banned === 'boolean') {
    if (params.id === r.user.id) return bad("You can't ban yourself.");
    await prisma.user.update({ where: { id: params.id }, data: { banned: b.banned } });
    if (b.banned) {
      await prisma.liveStream.updateMany({
        where: { hostId: params.id, isLive: true },
        data: { isLive: false, endedAt: new Date() },
      });
    }
  }
  if (typeof b.verified === 'boolean') {
    // Granting manually keeps any saved payout details; removing keeps them too (for the records)
    await prisma.user.update({
      where: { id: params.id },
      data: { verified: b.verified, verifiedAt: b.verified ? new Date() : null },
    });
  }
  return NextResponse.json({ ok: true });
}
