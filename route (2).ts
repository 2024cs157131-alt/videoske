import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import { earningsStatus } from '@/lib/earnings';

// Creator requests a withdrawal (paid weekly by admin). Rules: verified, once a week,
// at least the minimum (KSh 4,500 by default), and only from earnings older than the clearing period.
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;
  const b = await readJson(req);

  const s = await getSettings();
  const tokens = parseInt(String(b.tokens ?? ''), 10);
  if (!user.verified || !user.payoutMethod) return bad('Get verified first – payouts go to the details saved at verification.', 403);
  const method = user.payoutMethod;
  const phone =
    method === 'MPESA'
      ? user.payoutPhone
      : [user.payoutBank, user.payoutAccount, user.payoutSwift, user.payoutCountry].filter(Boolean).join(' · ');
  if (!phone) return bad('Your payout details are incomplete – contact an admin.');
  const st = await earningsStatus(user, s);
  if (st.nextRequestAt) {
    return bad(`You can request one payout per week. Next request from ${st.nextRequestAt.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })}.`);
  }
  if (!(tokens >= st.min)) return bad(`Minimum withdrawal is KSh ${st.min.toLocaleString()}.`);
  if (tokens > st.available) {
    return bad(`Only KSh ${st.available.toLocaleString()} is available now – earnings clear ${s.payout_hold_days} days after they’re earned.`);
  }

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
