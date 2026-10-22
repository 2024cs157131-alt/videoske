import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Subscribe / unsubscribe: { creatorId, subscribe: true|false }
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const me = r.user;
  const b = await readJson(req);
  const creatorId = String(b.creatorId ?? '');
  if (creatorId === me.id) return bad("You can't subscribe to yourself.");

  const creator = await prisma.user.findUnique({ where: { id: creatorId } });
  if (!creator || creator.banned) return bad('Creator not found.', 404);

  if (b.subscribe === false) {
    await prisma.follow.deleteMany({ where: { followerId: me.id, creatorId } });
  } else {
    try {
      await prisma.follow.create({ data: { followerId: me.id, creatorId } });
      await prisma.notification.create({
        data: {
          userId: creatorId,
          actorId: me.id,
          type: 'SUBSCRIBER',
          text: `@${me.username} subscribed to you`,
          link: `/u/${me.username}`,
        },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e; // already subscribed
    }
  }
  const subscribers = await prisma.follow.count({ where: { creatorId } });
  return NextResponse.json({ ok: true, subscribers });
}
