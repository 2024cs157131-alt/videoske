import type { Video } from '@prisma/client';
import { prisma } from './db';
import { PRIVATE_BUCKET, PUBLIC_BUCKET, supabaseAdmin } from './storage';

/** Remove a video's or post's files from storage (missing files are ignored). */
export async function deleteVideoFiles(v: Pick<Video, 'videoPath' | 'thumbPath' | 'previewPath'> & { imagePath?: string | null }) {
  const sb = supabaseAdmin();
  const priv = [v.videoPath, v.imagePath].filter((p): p is string => !!p);
  const pub = [v.thumbPath, v.previewPath, v.imagePath].filter((p): p is string => !!p);
  if (priv.length) await sb.storage.from(PRIVATE_BUCKET).remove(priv).catch(() => {});
  if (pub.length) await sb.storage.from(PUBLIC_BUCKET).remove(pub).catch(() => {});
}

/** Ban a user: they're logged out everywhere, their live streams end and their videos are hidden. */
export async function banUser(userId: string, reason: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { banned: true } }),
    prisma.liveStream.updateMany({ where: { hostId: userId, isLive: true }, data: { isLive: false, endedAt: new Date() } }),
    prisma.video.updateMany({
      where: { ownerId: userId, status: 'APPROVED' },
      data: { status: 'PENDING', moderationNote: `Hidden – uploader banned: ${reason}` },
    }),
  ]);
}
