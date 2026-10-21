import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Mark a payout as PAID (after sending the money) or REJECTED (tokens go back to the creator)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const status = b.status === 'PAID' ? 'PAID' : b.status === 'REJECTED' ? 'REJECTED' : null;
  if (!status) return bad('Invalid status.');
  const note = String(b.note ?? '').trim().slice(0, 200) || null;

  const done = await prisma.$transaction(async (tx) => {
    const p = await tx.payout.findUnique({ where: { id: params.id } });
    if (!p) return false;
    const moved = await tx.payout.updateMany({
      where: { id: p.id, status: 'PENDING' },
      data: { status, note, processedAt: new Date() },
    });
    if (moved.count === 0) return false;
    if (status === 'REJECTED') {
      await tx.user.update({ where: { id: p.userId }, data: { earnedTokens: { increment: p.tokens } } });
      await tx.ledgerEntry.create({
        data: { userId: p.userId, type: 'PAYOUT_REFUND', tokens: p.tokens, note: note ?? 'Withdrawal rejected' },
      });
    }
    return true;
  });
  if (!done) return bad('Payout not found or already processed.');
  return NextResponse.json({ ok: true });
}
