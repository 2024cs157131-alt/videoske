import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { getSettings } from '@/lib/settings';

/** Accepts 07XXXXXXXX, 01XXXXXXXX, 2547..., +2547... → 2547XXXXXXXX / 2541XXXXXXXX */
function normalizePhone(p: string) {
  const d = p.replace(/[\s-]/g, '').replace(/^\+/, '');
  const m = d.match(/^(?:254|0)?([17]\d{8})$/);
  return m ? `254${m[1]}` : null;
}

// Creator requests a withdrawal of earned tokens (paid out by admin)
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;
  const b = await readJson(req);

  const s = await getSettings();
  const min = parseInt(s.payout_min_tokens, 10) || 1000;
  const tokens = parseInt(String(b.tokens ?? ''), 10);
  const phone = normalizePhone(String(b.phone ?? ''));
  if (!phone) return bad('Enter a valid Safaricom number, e.g. 0712345678.');
  if (!(tokens >= min)) return bad(`Minimum withdrawal is ${min} tokens.`);

  const amountKes = Math.floor(tokens * (parseFloat(s.token_price_kes) || 1));
  const ok = await prisma.$transaction(async (tx) => {
    const taken = await tx.user.updateMany({
      where: { id: user.id, earnedTokens: { gte: tokens } },
      data: { earnedTokens: { decrement: tokens } },
    });
    if (taken.count === 0) return false;
    await tx.payout.create({ data: { userId: user.id, tokens, amountKes, phone } });
    await tx.ledgerEntry.create({
      data: { userId: user.id, type: 'PAYOUT', tokens: -tokens, note: `Withdrawal request (KES ${amountKes} to ${phone})` },
    });
    return true;
  });
  if (!ok) return bad("You don't have that many earned tokens.");
  return NextResponse.json({ ok: true });
}
