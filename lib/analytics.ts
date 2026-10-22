import { prisma } from './db';

const DAY = 86_400_000;
const EAT_MS = 3 * 3600_000;

/** Nairobi calendar day "YYYY-MM-DD" for a moment in time. */
export const dayKey = (d: Date) => new Date(d.getTime() + EAT_MS).toISOString().slice(0, 10);

/** The last `n` Nairobi days, oldest first, ending today (offset 0) or `offset` days ago. */
export function dayKeys(n: number, offset = 0) {
  return Array.from({ length: n }, (_, i) => dayKey(new Date(Date.now() - (offset + n - 1 - i) * DAY)));
}

type Row = { day: string; n: number };
type EarnRow = { day: string; type: string; n: number };

export type Series = Map<string, number>;
const toMap = (rows: Row[]): Series => new Map(rows.map((r) => [r.day, Number(r.n)]));
export const sum = (m: Series, keys: string[]) => keys.reduce((t, k) => t + (m.get(k) ?? 0), 0);

/** Percentage change from `prev` to `cur` (null when there's nothing to compare with). */
export function change(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

/**
 * Everything the analytics page needs, per Nairobi day, for the last `days` days
 * (enough to compare "last 30 days" with the 30 days before).
 */
export async function creatorAnalytics(userId: string, days = 60) {
  const since = new Date(Date.now() - days * DAY - DAY);

  const [earnRows, viewRows, salesRows, ticketRows, subRows] = await Promise.all([
    prisma.$queryRaw<EarnRow[]>`
      SELECT to_char("createdAt" + interval '3 hours', 'YYYY-MM-DD') AS day, "type"::text AS type, SUM("tokens")::int AS n
      FROM "LedgerEntry"
      WHERE "userId" = ${userId} AND "type"::text IN ('EARN', 'VIEWS', 'REFERRAL') AND "createdAt" >= ${since}
      GROUP BY 1, 2`,
    prisma.$queryRaw<Row[]>`
      SELECT to_char(vv."createdAt" + interval '3 hours', 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM "VideoView" vv JOIN "Video" v ON v."id" = vv."videoId"
      WHERE v."ownerId" = ${userId} AND vv."createdAt" >= ${since}
      GROUP BY 1`,
    prisma.$queryRaw<Row[]>`
      SELECT to_char(u."createdAt" + interval '3 hours', 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM "Unlock" u JOIN "Video" v ON v."id" = u."videoId"
      WHERE v."ownerId" = ${userId} AND u."createdAt" >= ${since}
      GROUP BY 1`,
    prisma.$queryRaw<Row[]>`
      SELECT to_char(t."createdAt" + interval '3 hours', 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM "LiveTicket" t JOIN "LiveStream" s ON s."id" = t."streamId"
      WHERE s."hostId" = ${userId} AND t."createdAt" >= ${since}
      GROUP BY 1`,
    prisma.$queryRaw<Row[]>`
      SELECT to_char("createdAt" + interval '3 hours', 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
      FROM "Follow"
      WHERE "creatorId" = ${userId} AND "createdAt" >= ${since}
      GROUP BY 1`,
  ]);

  const earnings: Series = new Map();
  const bySource = { EARN: new Map() as Series, VIEWS: new Map() as Series, REFERRAL: new Map() as Series };
  for (const r of earnRows) {
    const n = Number(r.n);
    earnings.set(r.day, (earnings.get(r.day) ?? 0) + n);
    const m = bySource[r.type as keyof typeof bySource];
    if (m) m.set(r.day, (m.get(r.day) ?? 0) + n);
  }
  const sales = toMap(salesRows);
  for (const r of ticketRows) sales.set(r.day, (sales.get(r.day) ?? 0) + Number(r.n));

  return { earnings, bySource, views: toMap(viewRows), sales, subscribers: toMap(subRows) };
}

/** Today vs yesterday, last 7 vs previous 7, last 30 vs previous 30. */
export function periods(m: Series) {
  const p = (n: number) => {
    const cur = sum(m, dayKeys(n));
    const prev = sum(m, dayKeys(n, n));
    return { cur, prev, change: change(cur, prev) };
  };
  return { day: p(1), week: p(7), month: p(30) };
}
