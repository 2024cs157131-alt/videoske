import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Reshare / undo: { reshare: true|false } → { reshared, count }
// A reshare shows the item on the resharer's profile and in the home feed ("🔁 Jane reshared").
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const me = r.user;
  const reshare = (await readJson(req)).reshare !== false;

  const item = await prisma.video.findUnique({ where: { id: params.id } });
  if (!item || item.status !== 'APPROVED') return bad('Not found.', 404);
  if (item.ownerId === me.id) return bad('You can’t reshare your own content – share it with the share buttons instead.');

  if (reshare) {
    try {
      await prisma.reshare.create({ data: { userId: me.id, videoId: item.id } });
      await prisma.notification.create({
        data: {
          userId: item.ownerId,
          actorId: me.id,
          type: 'RESHARE',
          text: `${me.displayName} reshared “${item.title}”`,
          link: `/v/${item.id}`,
        },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  } else {
    await prisma.reshare.deleteMany({ where: { userId: me.id, videoId: item.id } });
  }
  const count = await prisma.reshare.count({ where: { videoId: item.id } });
  return NextResponse.json({ reshared: reshare, count });
}
