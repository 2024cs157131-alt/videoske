import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import VideoCard from '@/components/VideoCard';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
  const user = await getCurrentUser();
  const q = (searchParams.q ?? '').trim();

  const [videos, live] = await Promise.all([
    prisma.video.findMany({
      where: {
        status: 'APPROVED',
        owner: { banned: false },
        ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { owner: { username: { contains: q.toLowerCase() } } }] } : {}),
      },
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.liveStream.findMany({ where: { isLive: true }, include: { host: true }, take: 8 }),
  ]);

  const bought = user
    ? new Set(
        (await prisma.purchase.findMany({ where: { userId: user.id }, select: { videoId: true } })).map((p) => p.videoId),
      )
    : new Set<string>();

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
                @{s.host.username} · {s.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="row between" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Latest videos</h1>
        <form method="get" style={{ minWidth: 220 }}>
          <input name="q" defaultValue={q} placeholder="Search videos or @creator" />
        </form>
      </div>

      {videos.length === 0 ? (
        <p className="muted">No videos yet.</p>
      ) : (
        <div className="grid">
          {videos.map((v) => (
            <VideoCard key={v.id} v={v} unlocked={!!user && (bought.has(v.id) || v.ownerId === user.id || user.role === 'ADMIN')} />
          ))}
        </div>
      )}
    </>
  );
}
