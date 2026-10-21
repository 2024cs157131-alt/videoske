import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { publicUrl, signedVideoUrl } from '@/lib/storage';
import UnlockForm from './UnlockForm';
import Comments from './Comments';
import ReportButton from './ReportButton';
import ActionButton from '@/components/ActionButton';

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

  let unlocked = isOwner || isAdmin;
  if (!unlocked && user) {
    unlocked = !!(await prisma.purchase.findUnique({
      where: { userId_videoId: { userId: user.id, videoId: video.id } },
    }));
  }

  const src = unlocked ? await signedVideoUrl(video.videoPath) : null;
  const thumb = publicUrl(video.thumbPath);
  const preview = publicUrl(video.previewPath);
  const settings = await getSettings();

  return (
    <div className="stack">
      {video.status !== 'APPROVED' && (
        <div className="error">
          Status: <strong>{video.status}</strong> — only you and admins can see this video until it is approved.
        </div>
      )}

      {unlocked && src ? (
        <div className="player">
          <video src={src} poster={thumb ?? undefined} controls controlsList="nodownload" playsInline />
        </div>
      ) : (
        <div className="player">
          {preview ? (
            <video src={preview} poster={thumb ?? undefined} autoPlay muted loop playsInline />
          ) : thumb ? (
            <img src={thumb} alt="" className="blur" />
          ) : (
            <div className="placeholder" />
          )}
          {preview && <span className="preview-tag">Preview</span>}
          <span className="lock-badge">🔒 Unlock full video · Ksh {video.price}</span>
        </div>
      )}

      <div className="row between">
        <div>
          <h1 style={{ margin: 0 }}>{video.title}</h1>
          <Link href={`/u/${video.owner.username}`} className="muted">
            @{video.owner.username} · {video.owner.displayName}
          </Link>
        </div>
        <div className="row">
          {user && !isOwner && <ReportButton videoId={video.id} />}
          {isAdmin && video.status !== 'APPROVED' && (
            <ActionButton url={`/api/admin/videos/${video.id}`} body={{ status: 'APPROVED' }} label="Approve" className="btn small ok" />
          )}
          {isAdmin && video.status !== 'REJECTED' && (
            <ActionButton
              url={`/api/admin/videos/${video.id}`}
              body={{ status: 'REJECTED' }}
              label="Reject / remove"
              className="btn small danger"
              confirmText="Remove this video from the site?"
            />
          )}
        </div>
      </div>
      {video.description && <p style={{ whiteSpace: 'pre-wrap' }}>{video.description}</p>}

      {!unlocked && (
        <UnlockForm
          videoId={video.id}
          price={video.price}
          tillNumber={settings.till_number}
          tillName={settings.till_name}
          loggedIn={!!user}
        />
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
