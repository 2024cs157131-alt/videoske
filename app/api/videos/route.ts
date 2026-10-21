import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser, resolveOwner } from '@/lib/api';
import { getSettings, randomPrice } from '@/lib/settings';

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
  if (b.consent !== true) {
    return bad('Confirm everyone shown is 18+, agreed to being filmed and published, and that you own the rights.');
  }
  if (!videoPath.startsWith(`${ownerId}/video/`)) return bad('Upload the video file first.');
  if (thumbPath && !thumbPath.startsWith(`${ownerId}/thumb/`)) return bad('Invalid thumbnail.');
  if (previewPath && !previewPath.startsWith(`${ownerId}/preview/`)) return bad('Invalid preview clip.');

  const autoPublish = (await getSettings()).auto_publish === 'true';
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
      // Published straight away when auto-publish is on (default); otherwise an admin reviews it first.
      status: user.role === 'ADMIN' || autoPublish ? 'APPROVED' : 'PENDING',
    },
  });
  return NextResponse.json({ id: video.id, price: video.price, status: video.status });
}
