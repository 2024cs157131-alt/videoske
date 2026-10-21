import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { PRIVATE_BUCKET, PUBLIC_BUCKET, supabaseAdmin } from '@/lib/storage';

// Admin moderation of a video. Body:
//   { action: 'DELETE' }   → delete the video and its files for good (closes its reports)
//   { action: 'WARN' }     → keep it published with a "sensitive content" warning (closes its reports)
//   { action: 'UNWARN' }   → remove the warning
//   { action: 'DISMISS' }  → reports were wrong: keep it published as it is (closes its reports)
//   { action: 'HIDE' }     → hide it until reviewed
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const action = String(b.action ?? '');

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return bad('Video not found (maybe already deleted).', 404);

  const closeReports = () => prisma.report.updateMany({ where: { videoId: video.id, resolved: false }, data: { resolved: true } });

  switch (action) {
    case 'DELETE': {
      // Remove files from storage first; ignore missing files
      const sb = supabaseAdmin();
      await sb.storage.from(PRIVATE_BUCKET).remove([video.videoPath]).catch(() => {});
      const pub = [video.thumbPath, video.previewPath].filter((p): p is string => !!p);
      if (pub.length) await sb.storage.from(PUBLIC_BUCKET).remove(pub).catch(() => {});
      await prisma.video.delete({ where: { id: video.id } }); // reports, comments, unlocks are removed with it
      break;
    }
    case 'WARN':
      await prisma.video.update({ where: { id: video.id }, data: { sensitive: true, status: 'APPROVED', moderationNote: null } });
      await closeReports();
      break;
    case 'UNWARN':
      await prisma.video.update({ where: { id: video.id }, data: { sensitive: false } });
      break;
    case 'DISMISS':
      await prisma.video.update({ where: { id: video.id }, data: { status: 'APPROVED', moderationNote: null } });
      await closeReports();
      break;
    case 'HIDE':
      await prisma.video.update({ where: { id: video.id }, data: { status: 'PENDING', moderationNote: 'Hidden by an admin – under review.' } });
      break;
    default:
      return bad('Invalid action.');
  }
  return NextResponse.json({ ok: true });
}
