import { prisma } from './db';
import type { ActionState } from '@/components/ActionBar';

/** Like/comment/reshare counts for a set of items, plus whether `userId` liked/reshared each. */
export async function socialState(ids: string[], userId?: string | null): Promise<Map<string, ActionState>> {
  const map = new Map<string, ActionState>();
  if (!ids.length) return map;
  const [likes, comments, reshares, myLikes, myReshares] = await Promise.all([
    prisma.like.groupBy({ by: ['videoId'], where: { videoId: { in: ids } }, _count: { _all: true } }),
    prisma.comment.groupBy({ by: ['videoId'], where: { videoId: { in: ids }, hidden: false }, _count: { _all: true } }),
    prisma.reshare.groupBy({ by: ['videoId'], where: { videoId: { in: ids } }, _count: { _all: true } }),
    userId ? prisma.like.findMany({ where: { userId, videoId: { in: ids } }, select: { videoId: true } }) : [],
    userId ? prisma.reshare.findMany({ where: { userId, videoId: { in: ids } }, select: { videoId: true } }) : [],
  ]);
  const count = (rows: { videoId: string; _count: { _all: number } }[]) => new Map(rows.map((r) => [r.videoId, r._count._all]));
  const L = count(likes);
  const C = count(comments);
  const R = count(reshares);
  const ML = new Set(myLikes.map((x) => x.videoId));
  const MR = new Set(myReshares.map((x) => x.videoId));
  for (const id of ids)
    map.set(id, {
      id,
      likes: L.get(id) ?? 0,
      liked: ML.has(id),
      comments: C.get(id) ?? 0,
      reshares: R.get(id) ?? 0,
      reshared: MR.has(id),
    });
  return map;
}
