import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { bad, requireApiUser } from '@/lib/api';
import { commissionPercent, getSettings } from '@/lib/settings';
import { InsufficientTokens, spendTokens } from '@/lib/tokens';

// Unlock a premium video with tokens
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;

  const video = await prisma.video.findUnique({ where: { id: params.id }, include: { owner: true } });
  if (!video || video.status !== 'APPROVED' || video.owner.banned) return bad('Video not found.', 404);
  if (!video.isPremium || video.ownerId === user.id || user.role === 'ADMIN') return NextResponse.json({ ok: true });

  const existing = await prisma.unlock.findUnique({ where: { userId_videoId: { userId: user.id, videoId: video.id } } });
  if (existing) return NextResponse.json({ ok: true });

  const commission = commissionPercent(await getSettings());
  try {
    await prisma.$transaction(async (tx) => {
      const share = await spendTokens(tx, {
        buyerId: user.id,
        owner: video.owner,
        price: video.price,
        commission,
        note: `Video: ${video.title}`,
      });
      await tx.unlock.create({ data: { userId: user.id, videoId: video.id, tokens: video.price, creatorShare: share } });
    });
  } catch (e) {
    if (e instanceof InsufficientTokens) return bad(`You need ${video.price} tokens. Top up your wallet first.`, 402);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return NextResponse.json({ ok: true });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
