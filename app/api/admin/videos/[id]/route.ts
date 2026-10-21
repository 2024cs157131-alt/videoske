import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Approve / reject a video
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const status = String(b.status ?? '');
  if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) return bad('Invalid status.');

  await prisma.video.update({
    where: { id: params.id },
    data: { status: status as 'APPROVED' | 'REJECTED' | 'PENDING' },
  });
  return NextResponse.json({ ok: true });
}
