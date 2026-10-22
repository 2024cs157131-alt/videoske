import { NextResponse } from 'next/server';
import { notifyNewContent } from '@/lib/notify';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser, resolveOwner } from '@/lib/api';
import { randomPrice } from '@/lib/settings';
import { initialStatus } from '@/lib/content';
import { fingerprintVideo } from '@/lib/fingerprint';
import { banUser, deleteVideoFiles } from '@/lib/moderation';

export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;
  const b = await readJson(req);

  const o = await resolveOwner(user, b.ownerId);
  if ('error' in o) return o.error;
  const ownerId = o.ownerId;

  const title = String(b.title ?? '').trim();
  const description = String(b.description ?? '').trim().slice(0, 2000) || null;
  const isPremium = b.isPremium === true;
  const videoPath = String(b.videoPath ?? '');
  const thumbPath = b.thumbPath ? String(b.thumbPath) : null;
  const previewPath = b.previewPath ? String(b.previewPath) : null;

  if (title.length < 3 || title.length > 120) return bad('Title must be 3–120 characters.');
  if (b.consent !== true || b.original !== true) {
    return bad('Confirm the video is your own original work, and that everyone shown is 18+ and agreed to it.');
  }
  if (!videoPath.startsWith(`${ownerId}/video/`)) return bad('Upload the video file first.');
  if (thumbPath && !thumbPath.startsWith(`${ownerId}/thumb/`)) return bad('Invalid thumbnail.');
  if (previewPath && !previewPath.startsWith(`${ownerId}/preview/`)) return bad('Invalid preview clip.');

  if (isPremium && user.role !== 'ADMIN') {
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner?.verified && !owner?.managedByAdmin) {
      return bad('Only verified creators can upload premium videos. Get verified first.', 403);
    }
  }

  // Originality check: the same file already uploaded by someone else = not their own → automatic ban
  const fingerprint = await fingerprintVideo(videoPath);
  if (fingerprint && user.role !== 'ADMIN') {
    const copy = await prisma.video.findFirst({ where: { fingerprint }, select: { ownerId: true } });
    if (copy) {
      await deleteVideoFiles({ videoPath, thumbPath, previewPath });
      if (copy.ownerId === ownerId) return bad('You have already uploaded this video.');
      await banUser(user.id, 're-uploaded another creator’s video');
      return bad(
        'This video already belongs to another creator. You agreed to upload only your own original videos, so your account has been banned.',
        403,
      );
    }
  }

  const video = await prisma.video.create({
    data: {
      title,
      description,
      isPremium,
      price: isPremium ? await randomPrice() : 0,
      videoPath,
      thumbPath,
      previewPath: isPremium ? previewPath : null,
      ownerId,
      sensitive: b.sensitive === true,
      fingerprint,
      // Sensitive uploads wait for admin review; others follow the auto-publish setting.
      ...(await initialStatus(user, b.sensitive === true)),
    },
  });
  const notified = video.status === 'APPROVED' ? await notifyNewContent(video.id) : 0;
  return NextResponse.json({ id: video.id, price: video.price, status: video.status, notified });
}
