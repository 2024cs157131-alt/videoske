import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Count a view when a full video starts playing (the browser sends this once per video per session)
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  await prisma.video.updateMany({ where: { id: params.id, status: 'APPROVED' }, data: { views: { increment: 1 } } });
  return NextResponse.json({ ok: true });
}
