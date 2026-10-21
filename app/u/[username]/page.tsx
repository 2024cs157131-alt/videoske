import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import VideoCard from '@/components/VideoCard';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const user = await getCurrentUser();
  const profile = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  const isAdmin = user?.role === 'ADMIN';
  if (!profile || (profile.banned && !isAdmin)) notFound();

  const isMe = user?.id === profile.id;
  const canSeeAll = isMe || isAdmin;

  const [videos, live] = await Promise.all([
    prisma.video.findMany({
      where: { ownerId: profile.id, ...(canSeeAll ? {} : { status: 'APPROVED' }) },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.liveStream.findFirst({ where: { hostId: profile.id, isLive: true } }),
  ]);

  const bought = user
    ? new Set(
        (await prisma.purchase.findMany({ where: { userId: user.id, video: { ownerId: profile.id } }, select: { videoId: true } })).map(
          (p) => p.videoId,
        ),
      )
    : new Set<string>();

  return (
    <div className="stack">
      <div className="card-panel row between">
        <div>
          <h1 style={{ margin: 0 }}>{profile.displayName}</h1>
          <div className="muted">
            @{profile.username} · {videos.length} video{videos.length === 1 ? '' : 's'}
            {profile.banned && ' · BANNED'}
          </div>
          {profile.bio && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}
        </div>
        <div className="row">
          {live && (
            <Link href={`/live/${live.id}`} className="btn">
              <span className="live-dot" /> Watch live
            </Link>
          )}
          {user && !isMe && !profile.managedByAdmin && (
            <Link href={`/chat/${profile.username}`} className="btn ghost">
              Message
            </Link>
          )}
          {(isMe || (isAdmin && profile.managedByAdmin)) && (
            <Link href={`/upload?owner=${profile.id}`} className="btn">
              + Add video
            </Link>
          )}
        </div>
      </div>

      {videos.length === 0 ? (
        <p className="muted">No videos yet.</p>
      ) : (
        <div className="grid">
          {videos.map((v) => (
            <VideoCard key={v.id} v={v} unlocked={canSeeAll || bought.has(v.id)} showStatus={canSeeAll} />
          ))}
        </div>
      )}
    </div>
  );
}
