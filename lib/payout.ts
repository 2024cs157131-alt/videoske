import type { User } from '@prisma/client';

/** Human-readable payout destination saved at verification, or null if none. */
export function payoutDestination(u: Pick<User, 'payoutMethod' | 'payoutPhone' | 'payoutBank' | 'payoutAccount' | 'payoutName'>) {
  if (u.payoutMethod === 'MPESA' && u.payoutPhone) return `M-PESA ${u.payoutPhone}${u.payoutName ? ` (${u.payoutName})` : ''}`;
  if (u.payoutMethod === 'BANK' && u.payoutAccount)
    return `${u.payoutBank ?? 'Bank'} ••••${u.payoutAccount.slice(-4)}${u.payoutName ? ` (${u.payoutName})` : ''}`;
  return null;
}
