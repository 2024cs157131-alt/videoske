import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { pickAds } from '@/lib/ads';
import { getPricing, priceLabel } from '@/lib/pricing';
import VideoCard from '@/components/VideoCard';
import NativeAd from '@/components/NativeAd';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: { q?: string; tab?: string } }) {
  const user = await getCurrentUser();
  const q = (searchParams.q ?? '').trim();
  const tab = searchParams.tab === 'free' ? 'free' : searchParams.tab === 'premium' ? 'premium' : 'all';

  const [videos, live, settings] = await Promise.all([
    prisma.video.findMany({
      where: {
        status: 'APPROVED',
        owner: { banned: false },
        ...(tab === 'free' ? { isPremium: false } : tab === 'premium' ? { isPremium: true } : {}),
        ...(q
          ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { owner: { username: { contains: q.toLowerCase() } } }] }
          : {}),
      },
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.liveStream.findMany({ where: { isLive: true, host: { banned: false } }, include: { host: true }, take: 8 }),
    getSettings(),
  ]);

  const unlocked = user
    ? new Set((await prisma.unlock.findMany({ where: { userId: user.id }, select: { videoId: true } })).map((u) => u.videoId))
    : new Set<string>();

  const pricing = await getPricing(settings);
  const every = parseInt(settings.native_ad_every, 10) || 0;
  const ads = every > 0 ? await pickAds('NATIVE', Math.floor(videos.length / every)) : [];

  const items: React.ReactNode[] = [];
  videos.forEach((v, i) => {
    items.push(
      <VideoCard
        key={v.id}
        v={v}
        pricing={pricing}
        unlocked={!!user && (unlocked.has(v.id) || v.ownerId === user.id || user.role === 'ADMIN')}
      />,
    );
    const ad = every > 0 && (i + 1) % every === 0 ? ads[(i + 1) / every - 1] : undefined;
    if (ad) items.push(<NativeAd key={`ad-${i}`} ad={ad} />);
  });

  const tabLink = (t: string, label: string) => (
    <Link href={`/?tab=${t}${q ? `&q=${encodeURIComponent(q)}` : ''}`} className={`btn small ${tab === t ? '' : 'ghost'}`}>
      {label}
    </Link>
  );

  return (
    <>
      {live.length > 0 && (
        <div className="card-panel" style={{ marginBottom: 20 }}>
          <div className="row between">
            <strong>
              <span className="live-dot" />
              Live now
            </strong>
            <Link href="/live" className="muted">
              See all
            </Link>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            {live.map((s) => (
              <Link key={s.id} href={`/live/${s.id}`} className="btn ghost small">
                @{s.host.username} · {s.title} {s.ticketPrice > 0 ? `· ${priceLabel(s.ticketPrice, pricing)}` : '· free'}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="row between" style={{ marginBottom: 16 }}>
        <div className="row">
          {tabLink('all', 'All')}
          {tabLink('free', 'Free')}
          {tabLink('premium', 'Premium')}
        </div>
        <form method="get" style={{ minWidth: 220 }}>
          {tab !== 'all' && <input type="hidden" name="tab" value={tab} />}
          <input name="q" defaultValue={q} placeholder="Search videos or @creator" />
        </form>
      </div>

      {videos.length === 0 ? <p className="muted">No videos yet.</p> : <div className="grid">{items}</div>}
    </>
  );
}
