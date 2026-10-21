import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, requireApiUser } from '@/lib/api';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream) return bad('Stream not found.', 404);
  if (stream.hostId !== r.user.id && r.user.role !== 'ADMIN') return bad('Only the host can end this stream.', 403);

  await prisma.liveStream.update({ where: { id: stream.id }, data: { isLive: false, endedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
