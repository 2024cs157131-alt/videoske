import Link from 'next/link';
import { prisma } from '@/lib/db';
import GoLiveForm from './GoLiveForm';

export const dynamic = 'force-dynamic';

export default async function LiveIndex() {
  const streams = await prisma.liveStream.findMany({
    where: { isLive: true, host: { banned: false } },
    include: { host: true },
    orderBy: { startedAt: 'desc' },
  });
  const configured = !!process.env.LIVEKIT_API_KEY && !!process.env.NEXT_PUBLIC_LIVEKIT_URL;

  return (
    <div className="stack">
      <div className="card-panel">
        <h1>Go live</h1>
        {configured ? <GoLiveForm /> : <p className="muted">Live streaming isn’t set up yet (admin: add LiveKit keys).</p>}
      </div>
      <div className="card-panel">
        <h2 style={{ marginTop: 0 }}>
          <span className="live-dot" />
          Live now
        </h2>
        {streams.length === 0 && <p className="muted">Nobody is live right now.</p>}
        {streams.map((s) => (
          <Link key={s.id} href={`/live/${s.id}`} className="list-item">
            <div>
              <strong>{s.title}</strong>
              <div className="muted">
                @{s.host.username} · started {s.startedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' })}
              </div>
            </div>
            <span className="btn small">Watch</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
