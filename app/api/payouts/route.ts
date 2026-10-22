import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { getSettings } from '@/lib/settings';

// Creator requests a withdrawal of earned tokens (paid out by admin)
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;
  const b = await readJson(req);

  const s = await getSettings();
  const min = parseInt(s.payout_min_tokens, 10) || 1000;
  const tokens = parseInt(String(b.tokens ?? ''), 10);
  if (!user.verified || !user.payoutMethod) return bad('Get verified first – payouts go to the details saved at verification.', 403);
  const method = user.payoutMethod;
  const phone =
    method === 'MPESA'
      ? user.payoutPhone
      : [user.payoutBank, user.payoutAccount, user.payoutSwift, user.payoutCountry].filter(Boolean).join(' · ');
  if (!phone) return bad('Your payout details are incomplete – contact an admin.');
  if (!(tokens >= min)) return bad(`Minimum withdrawal is ${min} tokens.`);

  const amountKes = Math.floor(tokens * (parseFloat(s.token_price_kes) || 1));
  const ok = await prisma.$transaction(async (tx) => {
    const taken = await tx.user.updateMany({
      where: { id: user.id, earnedTokens: { gte: tokens } },
      data: { earnedTokens: { decrement: tokens } },
    });
    if (taken.count === 0) return false;
    await tx.payout.create({ data: { userId: user.id, tokens, amountKes, phone, method } });
    await tx.ledgerEntry.create({
      data: { userId: user.id, type: 'PAYOUT', tokens: -tokens, note: `Withdrawal request (KSh ${amountKes} to ${method === 'MPESA' ? 'M-PESA ' + phone : 'bank account'})` },
    });
    return true;
  });
  if (!ok) return bad("You don't have that many earned tokens.");
  return NextResponse.json({ ok: true });
}
