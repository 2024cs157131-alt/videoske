import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { pickAds } from '@/lib/ads';
import { publicUrl, signedVideoUrl } from '@/lib/storage';
import Comments from './Comments';
import ReportButton from './ReportButton';
import ActionButton from '@/components/ActionButton';
import TokenUnlock from '@/components/TokenUnlock';
import Interstitial from '@/components/Interstitial';
import VideoPlayer from '@/components/VideoPlayer';
import Trailer from '@/components/Trailer';
import SensitiveGate from '@/components/SensitiveGate';
import { fmtViews } from '@/components/VideoCard';
import { getPricing, priceLabel } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function VideoPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    include: { owner: true, comments: { include: { user: true }, orderBy: { createdAt: 'asc' }, take: 200 } },
  });
  if (!video) notFound();

  const isOwner = user?.id === video.ownerId;
  const isAdmin = user?.role === 'ADMIN';
  if ((video.status !== 'APPROVED' || video.owner.banned) && !isOwner && !isAdmin) notFound();

  // Free videos: any logged-in member. Premium: owner, admin, or someone who unlocked it.
  let canWatch = !!user && (isOwner || isAdmin || !video.isPremium);
  if (!canWatch && user) {
    canWatch = !!(await prisma.unlock.findUnique({ where: { userId_videoId: { userId: user.id, videoId: video.id } } }));
  }

  const [src, settings] = await Promise.all([canWatch ? signedVideoUrl(video.videoPath) : null, getSettings()]);
  const pricing = await getPricing(settings);
  const minutes = parseInt(settings.interstitial_minutes, 10) || 0;
  const [ad] = minutes > 0 && !isAdmin ? await pickAds('INTERSTITIAL', 1) : [];
  const thumb = publicUrl(video.thumbPath);
  const preview = publicUrl(video.previewPath);

  return (
    <div className="stack">
      <Interstitial ad={ad ? { id: ad.id, title: ad.title, body: ad.body, imageUrl: ad.imageUrl } : null} minutes={minutes} />

      {video.status === 'PENDING' && (
        <div className="moderation-note">
          ⏳ {video.moderationNote ?? 'Waiting for admin review'} – only you and admins can see this video right now.
        </div>
      )}
      {video.status === 'REJECTED' && (
        <div className="error">
          {video.flaggedSexual ? '🚩 Flagged as sexual content – not published.' : 'Not published.'}{' '}
          {video.moderationNote && !video.flaggedSexual ? video.moderationNote : ''}
        </div>
      )}

      {canWatch && src ? (
        <div className="player">
          {video.sensitive ? (
            <SensitiveGate>
              <VideoPlayer id={video.id} src={src} poster={thumb ?? undefined} />
            </SensitiveGate>
          ) : (
            <VideoPlayer id={video.id} src={src} poster={thumb ?? undefined} />
          )}
        </div>
      ) : (
        <div className="player">
          {video.isPremium && preview ? (
            <Trailer src={preview} poster={thumb ?? undefined} />
          ) : thumb ? (
            <img src={thumb} alt="" className={video.isPremium ? 'greyed' : ''} />
          ) : (
            <div className="placeholder" />
          )}
          {video.isPremium && preview && <span className="preview-tag">Trailer</span>}
          <span className="lock-badge">
            {video.isPremium ? `🔒 Premium · ${priceLabel(video.price, pricing)}` : '▶ Free – log in to watch'}
          </span>
        </div>
      )}

      <div className="row between">
        <div>
          <h1 style={{ margin: 0 }}>
            {video.title} {!video.isPremium && <span className="badge" style={{ background: '#2b6cdf' }}>FREE</span>}{' '}
            {video.sensitive && <span className="badge" style={{ background: '#555' }}>⚠ Sensitive</span>}
          </h1>
          <Link href={`/u/${video.owner.username}`} className="muted">
            @{video.owner.username} · {video.owner.displayName}
          </Link>
          <span className="muted"> · {fmtViews(video.views)} views</span>
        </div>
        <div className="row">
          {user && !isOwner && <ReportButton videoId={video.id} />}
          {isAdmin && video.status !== 'APPROVED' && (
            <ActionButton url={`/api/admin/videos/${video.id}`} body={{ action: 'DISMISS' }} label="Publish" className="btn small ok" />
          )}
          {isAdmin && (
            <ActionButton
              url={`/api/admin/videos/${video.id}`}
              body={{ action: video.sensitive ? 'UNWARN' : 'WARN' }}
              label={video.sensitive ? 'Remove warning' : '⚠ Add warning'}
              className="btn small ghost"
            />
          )}
          {isAdmin && (
            <ActionButton
              url={`/api/admin/videos/${video.id}`}
              body={{ action: 'DELETE' }}
              label="🗑 Delete"
              className="btn small danger"
              confirmText="Delete this video and its files for good?"
              redirectTo="/admin"
            />
          )}
        </div>
      </div>
      {video.description && <p style={{ whiteSpace: 'pre-wrap' }}>{video.description}</p>}

      {!canWatch && video.isPremium && (
        <TokenUnlock
          url={`/api/videos/${video.id}/unlock`}
          price={video.price}
          priceText={priceLabel(video.price, pricing)}
          balance={user?.tokenBalance ?? 0}
          loggedIn={!!user}
          what="this video"
          loginNext={`/v/${video.id}`}
        />
      )}
      {!user && !video.isPremium && (
        <Link href={`/login?next=/v/${video.id}`} className="btn" style={{ alignSelf: 'flex-start' }}>
          Log in to watch for free
        </Link>
      )}

      <Comments
        videoId={video.id}
        canComment={!!user && video.status === 'APPROVED'}
        comments={video.comments.map((c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
          username: c.user.username,
        }))}
      />
    </div>
  );
}
