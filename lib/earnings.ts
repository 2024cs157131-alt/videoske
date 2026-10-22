import { prisma } from './db';
import type { Settings } from './settings';

const DAY = 86_400_000;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export type EarningsStatus = {
  total: number; // all unpaid earnings
  clearing: number; // earned in the last `holdDays` days – not withdrawable yet
  available: number; // can be requested now
  min: number; // minimum withdrawal
  nextRequestAt: Date | null; // set when a request was already made this week
  payoutDay: string; // e.g. "Friday"
  nextPayoutDate: Date;
};

/** Next occurrence of `weekday` (0 = Sunday) in Nairobi time, today included. */
export function nextWeekday(weekday: number, from = new Date()) {
  const eat = new Date(from.getTime() + 3 * 3600_000); // shift to EAT for the day-of-week maths
  const diff = (weekday - eat.getUTCDay() + 7) % 7;
  return new Date(from.getTime() + diff * DAY);
}

export async function earningsStatus(user: { id: string; earnedTokens: number }, s: Settings): Promise<EarningsStatus> {
  const holdDays = parseInt(s.payout_hold_days, 10) || 0;
  const weekday = Math.min(6, Math.max(0, parseInt(s.payout_weekday, 10) || 0));
  const now = Date.now();

  const [recent, lastRequest] = await Promise.all([
    holdDays > 0
      ? prisma.ledgerEntry.aggregate({
          where: {
            userId: user.id,
            type: { in: ['EARN', 'VIEWS', 'REFERRAL'] },
            createdAt: { gt: new Date(now - holdDays * DAY) },
          },
          _sum: { tokens: true },
        })
      : null,
    prisma.payout.findFirst({
      where: { userId: user.id, status: { not: 'REJECTED' }, createdAt: { gt: new Date(now - 7 * DAY) } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const clearing = Math.min(user.earnedTokens, Math.max(0, recent?._sum.tokens ?? 0));
  return {
    total: user.earnedTokens,
    clearing,
    available: Math.max(0, user.earnedTokens - clearing),
    min: parseInt(s.payout_min_tokens, 10) || 4500,
    nextRequestAt: lastRequest ? new Date(lastRequest.createdAt.getTime() + 7 * DAY) : null,
    payoutDay: WEEKDAYS[weekday],
    nextPayoutDate: nextWeekday(weekday),
  };
}

const EAT = 3 * 3600_000;
const dayKey = (d: Date) => new Date(d.getTime() + EAT).toISOString().slice(0, 10); // Nairobi calendar day

export type DayEarning = { key: string; label: string; amount: number; isToday: boolean };

/** Earnings (premium sales, views, referrals) per Nairobi day for the last `days` days, oldest first. */
export async function dailyEarnings(userId: string, days = 14): Promise<DayEarning[]> {
  const since = new Date(Date.now() - days * DAY);
  const rows = await prisma.ledgerEntry.findMany({
    where: { userId, type: { in: ['EARN', 'VIEWS', 'REFERRAL'] }, createdAt: { gte: since } },
    select: { tokens: true, createdAt: true },
  });
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(dayKey(r.createdAt), (totals.get(dayKey(r.createdAt)) ?? 0) + r.tokens);

  const today = dayKey(new Date());
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * DAY);
    const key = dayKey(d);
    return {
      key,
      label: d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', timeZone: 'Africa/Nairobi' }),
      amount: totals.get(key) ?? 0,
      isToday: key === today,
    };
  });
}
