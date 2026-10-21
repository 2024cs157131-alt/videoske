import type { Ad, AdType } from '@prisma/client';
import { prisma } from './db';

/** Pick `n` random active ads of a type (repeats allowed) and count an impression for each one shown. */
export async function pickAds(type: AdType, n: number): Promise<Ad[]> {
  if (n <= 0) return [];
  const ads = await prisma.ad.findMany({ where: { active: true, type } });
  if (!ads.length) return [];
  const picked = Array.from({ length: n }, () => ads[Math.floor(Math.random() * ads.length)]);
  const counts = new Map<string, number>();
  for (const a of picked) counts.set(a.id, (counts.get(a.id) ?? 0) + 1);
  await Promise.all(
    [...counts].map(([id, c]) => prisma.ad.update({ where: { id }, data: { impressions: { increment: c } } })),
  );
  return picked;
}
