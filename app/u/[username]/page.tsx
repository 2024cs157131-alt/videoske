import Link from 'next/link';
import VerifiedBadge from '@/components/VerifiedBadge';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import VideoCard from '@/components/VideoCard';
import ShareButtons from '@/components/ShareButtons';
import { headers } from 'next/headers';
import { getPricing } from '@/lib/pricing';
import { endStaleStreams } from '@/lib/live';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const user = await getCurrentUser();
  const profile = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  const isAdmin = user?.role === 'ADMIN';
  if (!profile || (profile.banned && !isAdmin)) notFound();

  const isMe = user?.id === profile.id;
  const canSeeAll = isMe || isAdmin;

  await endStaleStreams();
  const [videos, live] = await Promise.all([
    prisma.video.findMany({
      where: { ownerId: profile.id, ...(canSeeAll ? {} : { status: 'APPROVED' }) },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.liveStream.findFirst({ where: { hostId: profile.id, isLive: true, status: 'APPROVED' } }),
  ]);

  const pricing = await getPricing();
  const host = headers().get('x-forwarded-host') || headers().get('host') || 'videoske.vercel.app';
  const origin = (process.env.SITE_URL || `https://${host}`).replace(/\/$/, '');
  const totalViews = videos.reduce((n, v) => n + v.views, 0);
  const unlocked = user
    ? new Set(
        (
          await prisma.unlock.findMany({ where: { userId: user.id, video: { ownerId: profile.id } }, select: { videoId: true } })
        ).map((u) => u.videoId),
      )
    : new Set<string>();

  return (
    <div className="stack">
      <div className="card-panel row between">
        <div>
          <h1 style={{ margin: 0 }}>
            {profile.displayName} {profile.verified && <VerifiedBadge size={20} />}
          </h1>
          <div className="muted">
            @{profile.username} · {videos.length} video{videos.length === 1 ? '' : 's'} · {totalViews.toLocaleString()} views
            {profile.banned && ' · BANNED'}
          </div>
          {profile.bio && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}
          {!profile.banned && (
            <div style={{ marginTop: 10 }}>
              <ShareButtons url={`${origin}/u/${profile.username}${user ? `?ref=${user.username}` : ''}`} title={`${profile.displayName} on VideosKE`} />
            </div>
          )}
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
          {isMe && (
            <Link href="/wallet" className="btn ghost">
              🪙 Earnings: {profile.earnedTokens}
            </Link>
          )}
          {isMe && !profile.verified && (
            <Link href="/verify" className="btn ghost">
              <VerifiedBadge /> Get verified
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
            <VideoCard key={v.id} v={v} pricing={pricing} unlocked={canSeeAll || unlocked.has(v.id)} showStatus={canSeeAll} />
          ))}
        </div>
      )}
    </div>
  );
}
