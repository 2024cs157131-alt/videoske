import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Ban / unban a user
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  if (params.id === r.user.id) return bad("You can't ban yourself.");
  const b = await readJson(req);

  await prisma.user.update({ where: { id: params.id }, data: { banned: b.banned === true } });
  if (b.banned === true) {
    await prisma.liveStream.updateMany({
      where: { hostId: params.id, isLive: true },
      data: { isLive: false, endedAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
