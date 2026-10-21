import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { bad, requireApiUser } from '@/lib/api';
import { commissionPercent, getSettings } from '@/lib/settings';
import { InsufficientTokens, spendTokens } from '@/lib/tokens';

// Buy a ticket to a paid live stream
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;

  const stream = await prisma.liveStream.findUnique({ where: { id: params.id }, include: { host: true } });
  if (!stream || !stream.isLive) return bad('This stream has ended.', 404);
  if (stream.ticketPrice <= 0 || stream.hostId === user.id || user.role === 'ADMIN') return NextResponse.json({ ok: true });

  const commission = commissionPercent(await getSettings());
  try {
    await prisma.$transaction(async (tx) => {
      const share = await spendTokens(tx, {
        buyerId: user.id,
        owner: stream.host,
        price: stream.ticketPrice,
        commission,
        note: `Live: ${stream.title}`,
      });
      await tx.liveTicket.create({
        data: { userId: user.id, streamId: stream.id, tokens: stream.ticketPrice, creatorShare: share },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientTokens) return bad(`You need ${stream.ticketPrice} tokens. Top up your wallet first.`, 402);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return NextResponse.json({ ok: true });
    throw e;
  }
  return NextResponse.json({ ok: true });
}
