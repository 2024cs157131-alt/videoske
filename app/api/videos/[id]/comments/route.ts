import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const body = String(b.body ?? '').trim();
  if (!body || body.length > 1000) return bad('Comments must be 1–1000 characters.');

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video || video.status !== 'APPROVED') return bad('Video not found.', 404);

  await prisma.comment.create({ data: { body, userId: r.user.id, videoId: video.id } });
  return NextResponse.json({ ok: true });
}
