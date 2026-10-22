import { NextResponse } from 'next/server';
import { notifyLive } from '@/lib/notify';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Admin moderation of a live stream: APPROVE (viewers can join), FLAG (sexual content → ended), REJECT (ended)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const action = String(b.action ?? '');

  if (action === 'APPROVE') {
    await prisma.liveStream.update({ where: { id: params.id }, data: { status: 'APPROVED' } });
    await notifyLive(params.id);
  } else if (action === 'FLAG' || action === 'REJECT') {
    await prisma.liveStream.update({
      where: { id: params.id },
      data: { status: 'REJECTED', flaggedSexual: action === 'FLAG', isLive: false, endedAt: new Date() },
    });
  } else {
    return bad('Invalid action.');
  }
  return NextResponse.json({ ok: true });
}
