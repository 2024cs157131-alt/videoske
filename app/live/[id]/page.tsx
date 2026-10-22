import SubscribeButton from '@/components/SubscribeButton';
import Link from 'next/link';
import VerifiedBadge from '@/components/VerifiedBadge';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { endStaleStreams } from '@/lib/live';
import { getPricing, priceLabel } from '@/lib/pricing';
import ActionButton from '@/components/ActionButton';
import TokenUnlock from '@/components/TokenUnlock';
import AutoRefresh from '@/components/AutoRefresh';
import LiveRoom from './LiveRoom';

export const dynamic = 'force-dynamic';

export default async function LivePage({ params, searchParams }: { params: { id: string }; searchParams: { notified?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/live/${params.id}`);
  await endStaleStreams();
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id }, include: { host: true } });
  if (!stream) notFound();

  const pricing = await getPricing();
  const [subscribers, subscribed] = await Promise.all([
    prisma.follow.count({ where: { creatorId: stream.hostId } }),
    stream.hostId !== user.id
      ? prisma.follow.findUnique({ where: { followerId_creatorId: { followerId: user.id, creatorId: stream.hostId } } })
      : null,
  ]);
  const isHost = stream.hostId === user.id;
  const isAdmin = user.role === 'ADMIN';
  const waiting = stream.status === 'PENDING' && !isHost && !isAdmin;
  const needsTicket =
    !waiting &&
    stream.ticketPrice > 0 &&
    !isHost &&
    !isAdmin &&
    !(await prisma.liveTicket.findUnique({ where: { userId_streamId: { userId: user.id, streamId: stream.id } } }));

  return (
    <div className="stack">
      {!isHost && stream.isLive && <AutoRefresh seconds={waiting ? 15 : 30} />}
      {isHost && stream.isLive && searchParams.notified !== undefined && (
        <div className="success pop-in">
          {stream.status === 'APPROVED'
            ? `🔴 You’re live! 🔔 ${(parseInt(searchParams.notified, 10) || 0).toLocaleString()} subscribers notified.`
            : '⏳ Your subscribers will be notified as soon as an admin approves your stream.'}
        </div>
      )}
      <div className="row between">
        <div>
          <h1 style={{ margin: 0 }}>
            {stream.isLive && <span className="live-dot" />}
            {stream.title}
          </h1>
          <Link href={`/u/${stream.host.username}`} className="muted">
            @{stream.host.username} {stream.host.verified && <VerifiedBadge />} {stream.ticketPrice > 0 ? `· ticket ${priceLabel(stream.ticketPrice, pricing)}` : '· free stream'}
          </Link>
        </div>
        <div className="row">
          {!isHost && <SubscribeButton creatorId={stream.hostId} initialSubscribed={!!subscribed} initialCount={subscribers} loggedIn small />}
          {isAdmin && stream.isLive && stream.status === 'PENDING' && (
            <ActionButton url={`/api/admin/live/${stream.id}`} body={{ action: 'APPROVE' }} label="Approve" className="btn small ok" />
          )}
          {isAdmin && stream.isLive && (
            <>
              <ActionButton
                url={`/api/admin/live/${stream.id}`}
                body={{ action: 'FLAG' }}
                label="Flag sexual content"
                className="btn small danger"
                confirmText="Flag as sexual content and end this stream?"
                redirectTo="/admin"
              />
              <ActionButton
                url={`/api/admin/live/${stream.id}`}
                body={{ action: 'REJECT' }}
                label="Reject"
                className="btn small ghost"
                confirmText="Reject and end this stream?"
                redirectTo="/admin"
              />
            </>
          )}
          {stream.isLive && isHost && (
            <ActionButton
              url={`/api/live/${stream.id}/end`}
              label="End stream"
              className="btn danger"
              confirmText="End this live stream?"
              redirectTo="/live"
            />
          )}
        </div>
      </div>

      {!stream.isLive ? (
        <div className="card-panel">
          This stream has ended.{' '}
          <Link href="/live" style={{ textDecoration: 'underline' }}>
            See who’s live
          </Link>
        </div>
      ) : waiting ? (
        <div className="card-panel">⏳ This stream is waiting for admin approval. This page updates automatically.</div>
      ) : needsTicket ? (
        <TokenUnlock
          url={`/api/live/${stream.id}/ticket`}
          price={stream.ticketPrice}
          priceText={priceLabel(stream.ticketPrice, pricing)}
          balance={user.tokenBalance + user.bonusTokens}
          loggedIn
          what="this live stream"
          loginNext={`/live/${stream.id}`}
        />
      ) : (
        <LiveRoom streamId={stream.id} isHost={isHost} initialStatus={stream.status} />
      )}
    </div>
  );
}
