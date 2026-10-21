import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import ActionButton from '@/components/ActionButton';
import LiveRoom from './LiveRoom';

export const dynamic = 'force-dynamic';

export default async function LivePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/live/${params.id}`);
  const stream = await prisma.liveStream.findUnique({ where: { id: params.id }, include: { host: true } });
  if (!stream) notFound();

  const isHost = stream.hostId === user.id;

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1 style={{ margin: 0 }}>
            {stream.isLive && <span className="live-dot" />}
            {stream.title}
          </h1>
          <Link href={`/u/${stream.host.username}`} className="muted">
            @{stream.host.username}
          </Link>
        </div>
        {stream.isLive && (isHost || user.role === 'ADMIN') && (
          <ActionButton url={`/api/live/${stream.id}/end`} label="End stream" className="btn danger" confirmText="End this live stream?" redirectTo="/live" />
        )}
      </div>
      {stream.isLive ? (
        <LiveRoom streamId={stream.id} isHost={isHost} />
      ) : (
        <div className="card-panel">
          This stream has ended. <Link href="/live" style={{ textDecoration: 'underline' }}>See who’s live</Link>
        </div>
      )}
    </div>
  );
}
