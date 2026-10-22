import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Like / unlike: { like: true|false } → { liked, count }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const me = r.user;
  const like = (await readJson(req)).like !== false;

  const item = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
  if (!item || item.status !== 'APPROVED') return bad('Not found.', 404);

  if (like) {
    try {
      await prisma.like.create({ data: { userId: me.id, videoId: item.id } });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
    }
  } else {
    await prisma.like.deleteMany({ where: { userId: me.id, videoId: item.id } });
  }
  const count = await prisma.like.count({ where: { videoId: item.id } });
  return NextResponse.json({ liked: like, count });
}
