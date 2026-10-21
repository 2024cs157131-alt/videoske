import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import ActionButton from '@/components/ActionButton';
import TokenUnlock from '@/components/TokenUnlock';
import LiveRoom from './LiveRoom';
import { getPricing, priceLabel } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function LivePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/live/${params.id}`);
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id }, include: { host: true } });
  if (!stream) notFound();

  const pricing = await getPricing();
  const isHost = stream.hostId === user.id;
  const isAdmin = user.role === 'ADMIN';
  const needsTicket =
    stream.ticketPrice > 0 &&
    !isHost &&
    !isAdmin &&
    !(await prisma.liveTicket.findUnique({ where: { userId_streamId: { userId: user.id, streamId: stream.id } } }));

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1 style={{ margin: 0 }}>
            {stream.isLive && <span className="live-dot" />}
            {stream.title}
          </h1>
          <Link href={`/u/${stream.host.username}`} className="muted">
            @{stream.host.username} {stream.ticketPrice > 0 ? `· ticket ${priceLabel(stream.ticketPrice, pricing)}` : '· free stream'}
          </Link>
        </div>
        {stream.isLive && (isHost || isAdmin) && (
          <ActionButton
            url={`/api/live/${stream.id}/end`}
            label="End stream"
            className="btn danger"
            confirmText="End this live stream?"
            redirectTo="/live"
          />
        )}
      </div>
      {!stream.isLive ? (
        <div className="card-panel">
          This stream has ended.{' '}
          <Link href="/live" style={{ textDecoration: 'underline' }}>
            See who’s live
          </Link>
        </div>
      ) : needsTicket ? (
        <TokenUnlock
          url={`/api/live/${stream.id}/ticket`}
          price={stream.ticketPrice}
          priceText={priceLabel(stream.ticketPrice, pricing)}
          balance={user.tokenBalance}
          loggedIn
          what="this live stream"
          loginNext={`/live/${stream.id}`}
        />
      ) : (
        <LiveRoom streamId={stream.id} isHost={isHost} />
      )}
    </div>
  );
}
