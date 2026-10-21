import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiUser } from '@/lib/api';

// The host's page calls this every 20s. Returns the stream status so the host sees approval/removal.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  await prisma.liveStream.updateMany({
    where: { id: params.id, hostId: r.user.id, isLive: true },
    data: { lastSeenAt: new Date() },
  });
  const s = await prisma.liveStream.findUnique({ where: { id: params.id }, select: { isLive: true, status: true } });
  return NextResponse.json(s ?? { isLive: false, status: 'REJECTED' });
}
