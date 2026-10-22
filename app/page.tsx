import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { pickAds } from '@/lib/ads';
import { endStaleStreams, visibleLiveWhere } from '@/lib/live';
import { getPricing, priceLabel } from '@/lib/pricing';
import FeedEntry from '@/components/FeedEntry';
import { socialState } from '@/lib/social';
import { siteOrigin } from '@/lib/site';
import NativeAd from '@/components/NativeAd';
import Avatar from '@/components/Avatar';

export const dynamic = 'force-dynamic';

// One feed: videos and posts, free and premium, newest first. Only premium content is locked.
export default async function Home({ searchParams }: { searchParams: { q?: string; welcome?: string } }) {
  const user = await getCurrentUser();
  const q = (searchParams.q ?? '').trim();

  await endStaleStreams();
  const [items, live, settings] = await Promise.all([
    prisma.video.findMany({
      where: {
        status: 'APPROVED',
        owner: { banned: false },
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { body: { contains: q, mode: 'insensitive' } },
                { owner: { username: { contains: q.replace(/^@/, '').toLowerCase() } } },
              ],
            }
          : {}),
      },
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.liveStream.findMany({ where: visibleLiveWhere, include: { host: true }, take: 8 }),
    getSettings(),
  ]);
  // Recent reshares appear in the feed as "🔁 Jane reshared" (not while searching)
  const reshares = q
    ? []
    : await prisma.reshare.findMany({
        where: { user: { banned: false }, video: { status: 'APPROVED', owner: { banned: false } } },
        include: { user: true, video: { include: { owner: true } } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
  type Entry = { key: string; at: Date; item: (typeof items)[number]; by?: (typeof reshares)[number]['user'] };
  const entries: Entry[] = [
    ...items.map((v) => ({ key: v.id, at: v.createdAt, item: v })),
    ...reshares.map((r) => ({ key: `r-${r.id}`, at: r.createdAt, item: r.video, by: r.user })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 70);
  const [social, origin] = [await socialState([...new Set(entries.map((e) => e.item.id))], user?.id), siteOrigin()];

  const unlocked = user
    ? new Set((await prisma.unlock.findMany({ where: { userId: user.id }, select: { videoId: true } })).map((u) => u.videoId))
    : new Set<string>();
  const isUnlocked = (id: string, ownerId: string) =>
    !!user && (unlocked.has(id) || ownerId === user.id || user.role === 'ADMIN');

  const pricing = await getPricing(settings);
  const every = parseInt(settings.native_ad_every, 10) || 0;
  const ads = every > 0 ? await pickAds('NATIVE', Math.floor(entries.length / every)) : [];

  const cards: React.ReactNode[] = [];
  entries.forEach((e, i) => {
    cards.push(
      <FeedEntry
        key={e.key}
        item={e.item}
        resharedBy={e.by}
        pricing={pricing}
        unlocked={isUnlocked(e.item.id, e.item.ownerId)}
        social={social.get(e.item.id)}
        meId={user?.id}
        origin={origin}
        delay={Math.min(i, 12) * 40}
      />,
    );
    const ad = every > 0 && (i + 1) % every === 0 ? ads[(i + 1) / every - 1] : undefined;
    if (ad)
      cards.push(
        <div key={`ad-${i}`} className="feed-item">
          <NativeAd ad={ad} />
        </div>,
      );
  });

  const bonus = parseInt(settings.welcome_bonus, 10) || 0;

  return (
    <>
      {searchParams.welcome && user && bonus > 0 && (
        <div className="welcome-banner pop-in">
          🎁 Welcome to Vidaake! <strong>KSh {bonus} in free tokens</strong> has been added to your wallet – use it to unlock
          premium videos and posts.
        </div>
      )}

      {user && (
        <Link href="/new" className="composer pop-in">
          <Avatar user={user} size={38} />
          <span className="muted">What’s on your mind, {user.displayName.split(' ')[0]}? Share a thought or story…</span>
          <span className="btn small">Post</span>
        </Link>
      )}

      {live.length > 0 && (
        <div className="card-panel live-strip">
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
              <Link key={s.id} href={`/live/${s.id}`} className="live-chip">
                <Avatar user={s.host} size={26} />@{s.host.username} · {s.title}{' '}
                {s.ticketPrice > 0 ? `· ${priceLabel(s.ticketPrice, pricing)}` : '· free'}
              </Link>
            ))}
          </div>
        </div>
      )}

      <form method="get" className="search-bar">
        <input name="q" defaultValue={q} placeholder="Search videos, posts or @creators" />
      </form>

      {entries.length === 0 ? (
        <p className="muted">{q ? 'Nothing found.' : 'Nothing here yet – be the first to post!'}</p>
      ) : (
        <div className="grid feed">{cards}</div>
      )}
    </>
  );
}
