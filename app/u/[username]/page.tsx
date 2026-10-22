import Link from 'next/link';
import SubscribeButton from '@/components/SubscribeButton';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import VerifiedBadge from '@/components/VerifiedBadge';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import VideoCard from '@/components/VideoCard';
import PostCard from '@/components/PostCard';
import Avatar from '@/components/Avatar';
import ShareButtons from '@/components/ShareButtons';
import { siteOrigin } from '@/lib/site';
import { getPricing } from '@/lib/pricing';
import { endStaleStreams } from '@/lib/live';
import { publicUrl } from '@/lib/storage';
import { dailyEarnings } from '@/lib/earnings';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const p = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  if (!p || p.banned) return { title: 'Profile' };
  const image = publicUrl(p.avatarPath);
  return {
    title: `${p.displayName} (@${p.username})`,
    description: p.bio?.slice(0, 200) || `Videos and posts by ${p.displayName} on Vidaake`,
    openGraph: { images: image ? [{ url: image }] : [] },
  };
}

export default async function ProfilePage({ params, searchParams }: { params: { username: string }; searchParams: { show?: string } }) {
  const user = await getCurrentUser();
  const profile = await prisma.user.findUnique({ where: { username: params.username.toLowerCase() } });
  const isAdmin = user?.role === 'ADMIN';
  if (!profile || (profile.banned && !isAdmin)) notFound();

  const isMe = user?.id === profile.id;
  const canSeeAll = isMe || isAdmin;

  await endStaleStreams();
  const [items, live] = await Promise.all([
    prisma.video.findMany({
      where: { ownerId: profile.id, ...(canSeeAll ? {} : { status: 'APPROVED' }) },
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.liveStream.findFirst({ where: { hostId: profile.id, isLive: true, status: 'APPROVED' } }),
  ]);

  const [subscribers, subscribed] = await Promise.all([
    prisma.follow.count({ where: { creatorId: profile.id } }),
    user && !isMe ? prisma.follow.findUnique({ where: { followerId_creatorId: { followerId: user.id, creatorId: profile.id } } }) : null,
  ]);
  const pricing = await getPricing();
  const todayEarned = isMe ? ((await dailyEarnings(profile.id, 1))[0]?.amount ?? 0) : 0;
  const origin = siteOrigin();
  const totalViews = items.reduce((n, v) => n + v.views, 0);
  const videoCount = items.filter((v) => v.kind !== 'POST').length;
  const postCount = items.length - videoCount;
  const inReview = canSeeAll ? items.filter((v) => v.status === 'PENDING').length : 0;
  const unlocked = user
    ? new Set(
        (
          await prisma.unlock.findMany({ where: { userId: user.id, video: { ownerId: profile.id } }, select: { videoId: true } })
        ).map((u) => u.videoId),
      )
    : new Set<string>();

  return (
    <div className="stack fade-in">
      <div className="card-panel profile-head">
        <div className="profile-avatar">
          <Avatar user={profile} size={96} />
        </div>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 style={{ margin: 0 }}>
            {profile.displayName} {profile.verified && <VerifiedBadge size={20} />}
          </h1>
          <div className="muted">
            @{profile.username}
            {profile.banned && ' · BANNED'}
          </div>
          <div className="profile-stats">
            <span>
              <strong>{subscribers.toLocaleString()}</strong> subscribers
            </span>
            <span>
              <strong>{videoCount}</strong> videos
            </span>
            <span>
              <strong>{postCount}</strong> posts
            </span>
            <span>
              <strong>{totalViews.toLocaleString()}</strong> views
            </span>
          </div>
          {profile.bio && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}
          {!profile.banned && (
            <div style={{ marginTop: 10 }}>
              <ShareButtons
                url={`${origin}/u/${profile.username}${user ? `?ref=${user.username}` : ''}`}
                title={`${profile.displayName} on Vidaake`}
              />
            </div>
          )}
        </div>
        <div className="row" style={{ alignSelf: 'flex-start' }}>
          {live && (
            <Link href={`/live/${live.id}`} className="btn">
              <span className="live-dot" /> Watch live
            </Link>
          )}
          {!isMe && !profile.banned && (
            <SubscribeButton creatorId={profile.id} initialSubscribed={!!subscribed} initialCount={subscribers} loggedIn={!!user} />
          )}
          {isMe && (
            <Link href="/analytics" className="btn ghost">
              📊 Analytics
            </Link>
          )}
          {user && !isMe && !profile.managedByAdmin && (
            <Link href={`/chat/${profile.username}`} className="btn ghost">
              Message
            </Link>
          )}
          {isMe && (
            <Link href="/wallet" className="btn ghost" title="Your earnings today">
              💰 Today: KSh {todayEarned.toLocaleString()}
            </Link>
          )}
          {isMe && (
            <Link href="/settings" className="btn ghost">
              ✎ Edit profile
            </Link>
          )}
          {isMe && !profile.verified && (
            <Link href="/verify" className="btn ghost shine">
              <VerifiedBadge /> Upgrade
            </Link>
          )}
          {isMe && (
            <Link href="/new" className="btn ghost">
              + Post
            </Link>
          )}
          {(isMe || (isAdmin && profile.managedByAdmin)) && (
            <Link href={`/upload?owner=${profile.id}`} className="btn">
              + Video
            </Link>
          )}
        </div>
      </div>

      {inReview > 0 && (
        <div className="moderation-note">
          ⏳ {inReview} of {isMe ? 'your' : 'these'} items {inReview === 1 ? 'is' : 'are'} <strong>in review</strong> – only{' '}
          {isMe ? 'you' : 'the creator'} and admins can see them until an admin publishes them.
        </div>
      )}

      {items.length === 0 ? (
        <p className="muted">Nothing posted yet.</p>
      ) : (
        <div className="grid feed">
          {items.map((v, i) => (
            <div key={v.id} className="feed-item" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
              {v.kind === 'POST' ? (
                <PostCard p={v} pricing={pricing} unlocked={canSeeAll || unlocked.has(v.id)} showStatus={canSeeAll} />
              ) : (
                <VideoCard v={v} pricing={pricing} unlocked={canSeeAll || unlocked.has(v.id)} showStatus={canSeeAll} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
