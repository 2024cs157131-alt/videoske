import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import GoLiveForm from './GoLiveForm';
import { endStaleStreams, visibleLiveWhere } from '@/lib/live';
import { getPricing, priceLabel } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function LiveIndex() {
  await endStaleStreams();
  const [streams, s] = await Promise.all([
    prisma.liveStream.findMany({
      where: visibleLiveWhere,
      include: { host: true },
      orderBy: { startedAt: 'desc' },
    }),
    getSettings(),
  ]);
  const pricing = await getPricing(s);
  const configured = !!process.env.LIVEKIT_API_KEY && !!process.env.NEXT_PUBLIC_LIVEKIT_URL;

  return (
    <div className="stack">
      <div className="card-panel">
        <h1>Go live</h1>
        {configured ? (
          <GoLiveForm creatorPercent={100 - (parseInt(s.commission_percent, 10) || 30)} />
        ) : (
          <p className="muted">Live streaming isn’t set up yet (admin: add LiveKit keys).</p>
        )}
      </div>
      <div className="card-panel">
        <h2 style={{ marginTop: 0 }}>
          <span className="live-dot" />
          Live now
        </h2>
        {streams.length === 0 && <p className="muted">Nobody is live right now.</p>}
        {streams.map((st) => (
          <Link key={st.id} href={`/live/${st.id}`} className="list-item">
            <div>
              <strong>{st.title}</strong>
              <div className="muted">
                @{st.host.username} · started{' '}
                {st.startedAt.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' })}
              </div>
            </div>
            <span className="btn small">{st.ticketPrice > 0 ? priceLabel(st.ticketPrice, pricing) : 'Watch free'}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
