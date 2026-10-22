import Link from 'next/link';
import SubscribeButton from '@/components/SubscribeButton';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import VerifiedBadge from '@/components/VerifiedBadge';
import ShareButtons from '@/components/ShareButtons';
import { siteOrigin } from '@/lib/site';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { pickAds } from '@/lib/ads';
import { publicUrl, signedPrivateUrl, signedVideoUrl } from '@/lib/storage';
import { statusLabel } from '@/lib/content';
import Comments from './Comments';
import ReportButton from './ReportButton';
import ActionButton from '@/components/ActionButton';
import TokenUnlock from '@/components/TokenUnlock';
import Interstitial from '@/components/Interstitial';
import VideoPlayer from '@/components/VideoPlayer';
import Trailer from '@/components/Trailer';
import SensitiveGate from '@/components/SensitiveGate';
import Avatar from '@/components/Avatar';
import ViewBeacon from '@/components/ViewBeacon';
import { fmtViews } from '@/components/VideoCard';
import { timeAgo } from '@/components/PostCard';
import { getPricing, priceLabel } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

// Link preview (WhatsApp, Facebook, X, Telegram…): title, description and picture.
// Content with a warning, or premium post text, isn't put in the preview.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const v = await prisma.video.findUnique({ where: { id: params.id }, include: { owner: true } });
  if (!v || v.status !== 'APPROVED' || v.owner.banned) return { title: 'Vidaake' };
  const isPost = v.kind === 'POST';
  const title = `${v.title} – @${v.owner.username} on Vidaake`;
  const description = (
    isPost
      ? v.isPremium
        ? 'Premium post on Vidaake'
        : (v.body ?? '').slice(0, 200)
      : v.description || (v.isPremium ? 'Premium video on Vidaake' : 'Watch free on Vidaake')
  ).slice(0, 200);
  const imgPath = isPost ? (v.isPremium ? null : v.imagePath) : v.thumbPath;
  const image = !v.sensitive ? publicUrl(imgPath) : null;
  const url = `${siteOrigin()}/v/${v.id}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Vidaake', type: isPost ? 'article' : 'video.other', images: image ? [{ url: image }] : [] },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : [] },
  };
}

export default async function ContentPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { posted?: string; notified?: string };
}) {
  const user = await getCurrentUser();
  const item = await prisma.video.findUnique({
    where: { id: params.id },
    include: { owner: true, comments: { include: { user: true }, orderBy: { createdAt: 'asc' }, take: 200 } },
  });
  if (!item) notFound();

  const isPost = item.kind === 'POST';
  const isOwner = user?.id === item.ownerId;
  const isAdmin = user?.role === 'ADMIN';
  if ((item.status !== 'APPROVED' || item.owner.banned) && !isOwner && !isAdmin) notFound();

  // Free videos: logged-in members. Free posts: everyone. Premium: owner, admin, or someone who unlocked it.
  let canView = isOwner || isAdmin || (!item.isPremium && (isPost || !!user));
  if (!canView && user) {
    canView = !!(await prisma.unlock.findUnique({ where: { userId_videoId: { userId: user.id, videoId: item.id } } }));
  }

  const [settings, subscribers, subscribed] = await Promise.all([
    getSettings(),
    prisma.follow.count({ where: { creatorId: item.ownerId } }),
    user && !isOwner ? prisma.follow.findUnique({ where: { followerId_creatorId: { followerId: user.id, creatorId: item.ownerId } } }) : null,
  ]);
  const notifiedCount = parseInt(searchParams.notified ?? '', 10) || 0;
  const [src, postImg, pricing] = await Promise.all([
    !isPost && canView && item.videoPath ? signedVideoUrl(item.videoPath) : null,
    isPost && item.imagePath && canView
      ? item.isPremium
        ? signedPrivateUrl(item.imagePath)
        : Promise.resolve(publicUrl(item.imagePath))
      : null,
    getPricing(settings),
  ]);
  const minutes = parseInt(settings.interstitial_minutes, 10) || 0;
  const [ad] = minutes > 0 && !isAdmin ? await pickAds('INTERSTITIAL', 1) : [];
  const thumb = publicUrl(item.thumbPath);
  const preview = publicUrl(item.previewPath);
  const status = statusLabel(item.status, item.flaggedSexual);
  const what = isPost ? 'post' : 'video';

  const postBody = (
    <article className="post-full">
      <div style={{ whiteSpace: 'pre-wrap' }}>{item.body}</div>
      {postImg && <img src={postImg} alt="" className="post-img" />}
    </article>
  );

  return (
    <div className="stack fade-in">
      <Interstitial ad={ad ? { id: ad.id, title: ad.title, body: ad.body, imageUrl: ad.imageUrl } : null} minutes={minutes} />
      {isPost && canView && item.status === 'APPROVED' && <ViewBeacon id={item.id} />}

      {isOwner && searchParams.posted && (
        <div className="success pop-in">
          {item.status === 'APPROVED'
            ? notifiedCount > 0
              ? `🎉 Published! 🔔 ${notifiedCount.toLocaleString()} subscriber${notifiedCount === 1 ? ' was' : 's were'} notified.`
              : '🎉 Published! Share it below to get your first views and subscribers.'
            : '📨 Sent for review – your subscribers will be notified as soon as an admin publishes it.'}
        </div>
      )}

      {/* What the creator (and admins) see while it isn't public */}
      {item.status === 'PENDING' && (
        <div className="moderation-note">
          ⏳ <strong>In review.</strong> {item.moderationNote ?? 'Waiting for an admin.'} Only you and admins can see this {what}.
        </div>
      )}
      {item.status === 'REJECTED' && (
        <div className="error">
          <strong>{status}.</strong>{' '}
          {item.flaggedSexual ? 'Flagged as sexual content, which isn’t allowed on Vidaake.' : (item.moderationNote ?? '')}
        </div>
      )}

      {/* Author */}
      <div className="row between">
        <Link href={`/u/${item.owner.username}`} className="author">
          <Avatar user={item.owner} size={44} />
          <span>
            <strong>
              {item.owner.displayName} {item.owner.verified && <VerifiedBadge />}
            </strong>
            <span className="muted small" style={{ display: 'block' }}>
              @{item.owner.username} · {timeAgo(item.createdAt)} · {fmtViews(item.views)} views
            </span>
          </span>
        </Link>
        <div className="row">
          {!isOwner && (
            <SubscribeButton
              creatorId={item.ownerId}
              initialSubscribed={!!subscribed}
              initialCount={subscribers}
              loggedIn={!!user}
              small
            />
          )}
          {!item.isPremium && <span className="pill pill-free">FREE</span>}
          {item.isPremium && <span className="pill pill-lock">PREMIUM</span>}
          {item.sensitive && <span className="pill">⚠ Sensitive</span>}
        </div>
      </div>

      {/* Content */}
      {isPost ? (
        canView ? (
          item.sensitive ? (
            <SensitiveGate>{postBody}</SensitiveGate>
          ) : (
            postBody
          )
        ) : (
          <article className="post-full">
            <div className="post-body locked">{(item.body ?? '').slice(0, 220)}</div>
          </article>
        )
      ) : canView && src ? (
        <div className="player">
          {item.sensitive ? (
            <SensitiveGate>
              <VideoPlayer id={item.id} src={src} poster={thumb ?? undefined} />
            </SensitiveGate>
          ) : (
            <VideoPlayer id={item.id} src={src} poster={thumb ?? undefined} />
          )}
        </div>
      ) : (
        <div className="player">
          {item.isPremium && preview ? (
            <Trailer src={preview} poster={thumb ?? undefined} />
          ) : thumb ? (
            <img src={thumb} alt="" className={item.isPremium ? 'greyed' : ''} />
          ) : (
            <div className="placeholder" />
          )}
          {item.isPremium && preview && <span className="preview-tag">Trailer</span>}
          <span className="lock-badge">
            {item.isPremium ? `🔒 Premium · ${priceLabel(item.price, pricing)}` : '▶ Free – log in to watch'}
          </span>
        </div>
      )}

      {!isPost && <h1 style={{ margin: 0 }}>{item.title}</h1>}
      {!isPost && item.description && <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.description}</p>}

      {!canView && item.isPremium && (
        <TokenUnlock
          url={`/api/videos/${item.id}/unlock`}
          price={item.price}
          priceText={priceLabel(item.price, pricing)}
          balance={(user?.tokenBalance ?? 0) + (user?.bonusTokens ?? 0)}
          loggedIn={!!user}
          what={`this ${what}`}
          loginNext={`/v/${item.id}`}
        />
      )}
      {!user && !item.isPremium && !isPost && (
        <Link href={`/login?next=/v/${item.id}`} className="btn" style={{ alignSelf: 'flex-start' }}>
          Log in to watch for free
        </Link>
      )}

      <div className="row between">
        {item.status === 'APPROVED' ? (
          <ShareButtons url={`${siteOrigin()}/v/${item.id}${user ? `?ref=${user.username}` : ''}`} title={item.title} />
        ) : (
          <span />
        )}
        <div className="row">
          {user && !isOwner && <ReportButton videoId={item.id} />}
          {isAdmin && item.status !== 'APPROVED' && (
            <ActionButton url={`/api/admin/videos/${item.id}`} body={{ action: 'PUBLISH' }} label="✓ Publish" className="btn small ok" />
          )}
          {isAdmin && item.status === 'APPROVED' && (
            <ActionButton
              url={`/api/admin/videos/${item.id}`}
              body={{ action: 'UNPUBLISH' }}
              label="Unpublish"
              className="btn small ghost"
              confirmText={`Unpublish this ${what}? The creator will see it as unpublished.`}
            />
          )}
          {isAdmin && item.status === 'PENDING' && (
            <ActionButton
              url={`/api/admin/videos/${item.id}`}
              body={{ action: 'UNPUBLISH' }}
              label="✕ Unpublish"
              className="btn small ghost"
            />
          )}
          {isAdmin && (
            <ActionButton
              url={`/api/admin/videos/${item.id}`}
              body={{ action: item.sensitive ? 'UNWARN' : 'WARN' }}
              label={item.sensitive ? 'Remove warning' : '⚠ Add warning'}
              className="btn small ghost"
            />
          )}
          {isAdmin && (
            <ActionButton
              url={`/api/admin/videos/${item.id}`}
              body={{ action: 'DELETE' }}
              label="🗑 Delete"
              className="btn small danger"
              confirmText={`Delete this ${what} for good?`}
              redirectTo="/admin"
            />
          )}
          {isAdmin && !isOwner && (
            <ActionButton
              url={`/api/admin/videos/${item.id}`}
              body={{ action: 'DELETE_BAN' }}
              label="🚫 Not original – ban"
              className="btn small danger"
              confirmText={`Delete this ${what} and ban @${item.owner.username} for posting content that isn't theirs?`}
              redirectTo="/admin"
            />
          )}
        </div>
      </div>

      <Comments
        videoId={item.id}
        canComment={!!user && item.status === 'APPROVED'}
        comments={item.comments.map((c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
          username: c.user.username,
          displayName: c.user.displayName,
          avatarUrl: publicUrl(c.user.avatarPath),
          verified: c.user.verified,
        }))}
      />
    </div>
  );
}
