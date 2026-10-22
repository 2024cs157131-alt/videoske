import { prisma } from './db';

const CHUNK = 1000;
const FRESH_MS = 7 * 86_400_000; // don't announce old content (e.g. when an admin clears old reports)

async function fanOut(creatorId: string, make: (followerId: string) => { type: string; text: string; link: string }) {
  const followers = await prisma.follow.findMany({
    where: { creatorId, follower: { banned: false } },
    select: { followerId: true },
  });
  for (let i = 0; i < followers.length; i += CHUNK) {
    await prisma.notification.createMany({
      data: followers.slice(i, i + CHUNK).map((f) => ({ userId: f.followerId, actorId: creatorId, ...make(f.followerId) })),
    });
  }
  return followers.length;
}

/** Tell a creator's subscribers about a newly published video/post. Runs once per item. Returns how many were told. */
export async function notifyNewContent(contentId: string) {
  const claimed = await prisma.video.updateMany({
    where: { id: contentId, status: 'APPROVED', notifiedAt: null, createdAt: { gt: new Date(Date.now() - FRESH_MS) } },
    data: { notifiedAt: new Date() },
  });
  if (claimed.count === 0) return 0;
  const v = await prisma.video.findUnique({ where: { id: contentId }, include: { owner: true } });
  if (!v || v.owner.banned) return 0;
  const isPost = v.kind === 'POST';
  return fanOut(v.ownerId, () => ({
    type: isPost ? 'POST' : 'UPLOAD',
    text: isPost
      ? `@${v.owner.username} shared a new ${v.isPremium ? 'premium ' : ''}post: “${v.title}”`
      : `@${v.owner.username} uploaded a new ${v.isPremium ? 'premium ' : ''}video: “${v.title}”`,
    link: `/v/${v.id}`,
  }));
}

/** Tell a creator's subscribers they just went live (once per stream). */
export async function notifyLive(streamId: string) {
  const claimed = await prisma.liveStream.updateMany({
    where: { id: streamId, status: 'APPROVED', isLive: true, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });
  if (claimed.count === 0) return 0;
  const s = await prisma.liveStream.findUnique({ where: { id: streamId }, include: { host: true } });
  if (!s) return 0;
  return fanOut(s.hostId, () => ({
    type: 'LIVE',
    text: `🔴 @${s.host.username} is live now: “${s.title}”`,
    link: `/live/${s.id}`,
  }));
}
