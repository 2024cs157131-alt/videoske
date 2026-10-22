import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

// Called when a full video starts playing (the browser sends this once per video per session).
// - Every play adds to the public view count.
// - Each logged-in viewer (not the creator) counts once as a unique view. For free videos by verified
//   creators, every 1000 unique views earns the creator `views_rate` tokens (= KSh).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({ where: { id: params.id }, include: { owner: true } });
  if (!video || video.status !== 'APPROVED') return NextResponse.json({ ok: true });

  await prisma.video.update({ where: { id: video.id }, data: { views: { increment: 1 } } });

  const user = await getCurrentUser();
  if (!user || user.id === video.ownerId) return NextResponse.json({ ok: true });

  try {
    await prisma.videoView.create({ data: { videoId: video.id, userId: user.id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return NextResponse.json({ ok: true });
    throw e;
  }

  const { paidViews } = await prisma.video.update({
    where: { id: video.id },
    data: { paidViews: { increment: 1 } },
    select: { paidViews: true },
  });

  const earns = !video.isPremium && video.owner.verified && !video.owner.banned && !video.owner.managedByAdmin;
  if (earns && paidViews % 1000 === 0) {
    // Only the request that reaches the exact multiple of 1000 gets here (increments are atomic)
    const rate = parseInt((await getSettings()).views_rate, 10) || 0;
    if (rate > 0) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: video.ownerId }, data: { earnedTokens: { increment: rate } } }),
        prisma.ledgerEntry.create({
          data: { userId: video.ownerId, type: 'VIEWS', tokens: rate, note: `${paidViews.toLocaleString()} unique views: ${video.title}` },
        }),
      ]);
    }
  }
  return NextResponse.json({ ok: true });
}
