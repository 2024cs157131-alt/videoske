import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Post a comment (the creator is notified)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const me = r.user;
  const b = await readJson(req);
  const body = String(b.body ?? '').trim();
  if (!body || body.length > 1000) return bad('Comments must be 1–1000 characters.');

  const item = await prisma.video.findUnique({ where: { id: params.id } });
  if (!item || item.status !== 'APPROVED') return bad('Not found.', 404);

  // Slow down spam: at most 5 comments a minute
  const recent = await prisma.comment.count({ where: { userId: me.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (recent >= 5) return bad('You’re commenting too fast – wait a moment.', 429);

  await prisma.comment.create({ data: { body, userId: me.id, videoId: item.id } });
  if (item.ownerId !== me.id) {
    await prisma.notification.create({
      data: {
        userId: item.ownerId,
        actorId: me.id,
        type: 'COMMENT',
        text: `${me.displayName} commented on “${item.title}”: ${body.length > 80 ? body.slice(0, 77) + '…' : body}`,
        link: `/v/${item.id}#comments`,
      },
    });
  }
  return NextResponse.json({ ok: true });
}
