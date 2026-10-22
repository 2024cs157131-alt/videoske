import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { SITE_DOMAIN } from '@/lib/site';

export const dynamic = 'force-dynamic'; // built on request (never during deploys)

// Public videos (without content warnings) and creator profiles, for Google & co.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.SITE_URL || `https://${SITE_DOMAIN}`;
  const [videos, creators] = await Promise.all([
    prisma.video.findMany({
      where: { status: 'APPROVED', sensitive: false, owner: { banned: false } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    }),
    prisma.user.findMany({
      where: { banned: false, videos: { some: { status: 'APPROVED' } } },
      select: { username: true },
      take: 5000,
    }),
  ]);
  return [
    { url: `${site}/`, changeFrequency: 'hourly', priority: 1 },
    { url: `${site}/terms`, changeFrequency: 'monthly', priority: 0.2 },
    ...videos.map((v) => ({ url: `${site}/v/${v.id}`, lastModified: v.createdAt, priority: 0.8 })),
    ...creators.map((c) => ({ url: `${site}/u/${c.username}`, changeFrequency: 'daily' as const, priority: 0.6 })),
  ];
}
