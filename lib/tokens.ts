import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { getSettings } from './settings';
import { normalizeKePhone, type PaystackTxn } from './paystack';

export class InsufficientTokens extends Error {}

/**
 * Credit tokens for a Paystack payment. Safe to call many times (webhook + callback):
 * tokens are only added the first time the purchase moves from PENDING to SUCCESS.
 * Also pays the referral reward the first time a referred member becomes active.
 */
export async function settlePurchase(
  reference: string,
  txn: Pick<PaystackTxn, 'status' | 'amount' | 'currency' | 'channel' | 'customer' | 'authorization'>,
) {
  if (txn.status === 'failed') {
    await prisma.tokenPurchase.updateMany({ where: { reference, status: 'PENDING' }, data: { status: 'FAILED' } });
    return false;
  }
  if (txn.status !== 'success') return false; // still pending/abandoned

  const s = await getSettings();
  const reward = parseInt(s.referral_reward, 10) || 0;
  const minPurchase = parseInt(s.referral_min_purchase, 10) || 0;

  return prisma.$transaction(async (tx) => {
    const p = await tx.tokenPurchase.findUnique({ where: { reference } });
    if (!p) return false;
    if (p.amount !== Number(txn.amount) || p.currency !== txn.currency) {
      console.error('Paystack amount/currency mismatch', reference, txn);
      return false;
    }
    const moved = await tx.tokenPurchase.updateMany({
      where: { reference, status: 'PENDING' },
      data: { status: 'SUCCESS', paidAt: new Date(), channel: txn.channel ?? null },
    });
    if (moved.count === 0) return p.status === 'SUCCESS';

    if (p.purpose === 'VERIFICATION') {
      // Save the payout details. For M-PESA, payouts go to the number that actually paid the fee.
      const meta = (p.meta ?? {}) as Record<string, string | undefined>;
      const paidPhone = normalizeKePhone(txn.customer?.phone);
      const mpesa = meta.method === 'MPESA';
      await tx.user.update({
        where: { id: p.userId },
        data: {
          verified: true,
          verifiedAt: new Date(),
          payoutMethod: mpesa ? 'MPESA' : 'BANK',
          payoutName: meta.name ?? null,
          payoutPhone: mpesa ? (paidPhone ?? meta.phone ?? null) : null,
          payoutBank: mpesa ? null : (meta.bank ?? null),
          payoutAccount: mpesa ? null : (meta.account ?? null),
          payoutSwift: mpesa ? null : (meta.swift ?? null),
          payoutCountry: mpesa ? 'KE' : (meta.country ?? null),
        },
      });
      const via = txn.channel === 'mobile_money' ? `M-PESA ${paidPhone ?? ''}`.trim() : `card ${txn.authorization?.last4 ? '•••• ' + txn.authorization.last4 : ''}`.trim();
      await tx.ledgerEntry.create({
        data: { userId: p.userId, type: 'VERIFICATION', tokens: 0, note: `Creator verification paid (${via})` },
      });
      return true;
    }

    const buyer = await tx.user.update({ where: { id: p.userId }, data: { tokenBalance: { increment: p.tokens } } });
    await tx.ledgerEntry.create({
      data: { userId: p.userId, type: 'PURCHASE', tokens: p.tokens, note: `Bought ${p.tokens} tokens` },
    });

    // Referral: pay the referrer once, when this member's total purchases reach the minimum
    if (reward > 0 && buyer.referredById && !buyer.referralRewarded) {
      const bought = await tx.tokenPurchase.aggregate({
        where: { userId: buyer.id, status: 'SUCCESS', purpose: 'TOKENS' },
        _sum: { tokens: true },
      });
      if ((bought._sum.tokens ?? 0) >= minPurchase) {
        const flagged = await tx.user.updateMany({
          where: { id: buyer.id, referralRewarded: false },
          data: { referralRewarded: true },
        });
        if (flagged.count === 1) {
          await tx.user.update({ where: { id: buyer.referredById }, data: { earnedTokens: { increment: reward } } });
          await tx.ledgerEntry.create({
            data: { userId: buyer.referredById, type: 'REFERRAL', tokens: reward, note: `Referral reward: @${buyer.username} became active` },
          });
        }
      }
    }
    return true;
  });
}

/**
 * Move `price` tokens from buyer to creator (minus platform commission), inside a transaction.
 * Free welcome-bonus tokens are spent first; the creator's share is paid only on the part bought with
 * real money (bonus tokens are free, so paying creators for them would let fake accounts cash out).
 * Returns the creator's share. Admin-run profiles and admins earn nothing (platform keeps 100%).
 */
export async function spendTokens(
  tx: Prisma.TransactionClient,
  o: { buyerId: string; owner: { id: string; role: string; managedByAdmin: boolean }; price: number; commission: number; note: string },
) {
  const buyer = await tx.user.findUnique({ where: { id: o.buyerId }, select: { bonusTokens: true, tokenBalance: true } });
  if (!buyer) throw new InsufficientTokens();
  const fromBonus = Math.min(buyer.bonusTokens, o.price);
  const fromPaid = o.price - fromBonus;

  const taken = await tx.user.updateMany({
    where: { id: o.buyerId, bonusTokens: { gte: fromBonus }, tokenBalance: { gte: fromPaid } },
    data: { bonusTokens: { decrement: fromBonus }, tokenBalance: { decrement: fromPaid } },
  });
  if (taken.count === 0) throw new InsufficientTokens();
  await tx.ledgerEntry.create({
    data: {
      userId: o.buyerId,
      type: 'SPEND',
      tokens: -o.price,
      note: fromBonus ? `${o.note} (${fromBonus} bonus)` : o.note,
    },
  });

  if (o.owner.managedByAdmin || o.owner.role === 'ADMIN') return 0;
  const share = Math.floor((fromPaid * (100 - o.commission)) / 100);
  if (share > 0) {
    await tx.user.update({ where: { id: o.owner.id }, data: { earnedTokens: { increment: share } } });
    await tx.ledgerEntry.create({ data: { userId: o.owner.id, type: 'EARN', tokens: share, note: o.note } });
  }
  return share;
}
