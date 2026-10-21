import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import { REPORT_CATEGORIES } from '@/lib/reports';


// Report a video. Hidden automatically when it reaches the report limit, or at once for a possible minor.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const category = String(b.category ?? 'OTHER') as keyof typeof REPORT_CATEGORIES;
  if (!(category in REPORT_CATEGORIES)) return bad('Choose a reason.');
  const reason = String(b.reason ?? '').trim().slice(0, 500) || REPORT_CATEGORIES[category];

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return bad('Video not found.', 404);

  const already = await prisma.report.findFirst({ where: { videoId: video.id, reporterId: r.user.id, resolved: false } });
  if (already) return NextResponse.json({ ok: true }); // one open report per person per video

  await prisma.report.create({ data: { category, reason, reporterId: r.user.id, videoId: video.id } });

  if (video.status === 'APPROVED') {
    const limit = parseInt((await getSettings()).auto_hide_reports, 10) || 0;
    const open = await prisma.report.count({ where: { videoId: video.id, resolved: false } });
    if (category === 'UNDERAGE' || (limit > 0 && open >= limit)) {
      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'PENDING', moderationNote: 'Hidden after reports – waiting for admin review.' },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
