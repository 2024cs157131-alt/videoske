import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const reason = String(b.reason ?? '').trim();
  if (reason.length < 3 || reason.length > 500) return bad('Tell us briefly what is wrong (3–500 characters).');

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return bad('Video not found.', 404);

  await prisma.report.create({ data: { reason, reporterId: r.user.id, videoId: video.id } });
  return NextResponse.json({ ok: true });
}
