'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

type C = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
  hidden: boolean;
  reportCount: number;
};

export default function Comments({
  videoId,
  comments,
  canComment,
  meId,
  canModerate,
  isAdmin,
}: {
  videoId: string;
  comments: C[];
  canComment: boolean;
  meId: string | null;
  canModerate: boolean; // creator of the video/post, or admin
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await postJSON(`/api/videos/${videoId}/comments`, { body });
      setBody('');
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, action: 'DELETE' | 'HIDE' | 'SHOW' | 'REPORT') {
    if (action === 'DELETE' && !confirm('Delete this comment?')) return;
    try {
      await postJSON(`/api/comments/${id}`, { action });
      if (action === 'REPORT') setReported((s) => new Set(s).add(id));
      else router.refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  const visible = comments.filter((c) => !c.hidden).length;

  return (
    <div className="card-panel" id="comments">
      <h2 style={{ marginTop: 0 }}>Comments ({visible})</h2>
      {canComment && (
        <form onSubmit={submit} className="row" style={{ marginBottom: 12 }}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" maxLength={1000} style={{ flex: 1 }} />
          <button className="btn small" disabled={busy}>
            Post
          </button>
        </form>
      )}
      {comments.length === 0 && <p className="muted">No comments yet – be the first.</p>}
      {comments.map((c) => {
        const mine = c.userId === meId;
        return (
          <div key={c.id} className={`comment fade-in ${c.hidden ? 'is-hidden' : ''}`}>
            <Link href={`/u/${c.username}`} className="comment-avatar" aria-hidden>
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt="" className="avatar" style={{ width: 32, height: 32 }} />
              ) : (
                <span className="avatar avatar-initials" style={{ width: 32, height: 32, fontSize: 13, background: '#2b6cdf' }}>
                  {(c.displayName || c.username)[0]?.toUpperCase()}
                </span>
              )}
            </Link>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Link href={`/u/${c.username}`}>
                <strong>{c.displayName}</strong>
              </Link>{' '}
              {c.verified && (
                <span title="Verified creator" className="mini-badge">
                  ✓
                </span>
              )}{' '}
              <span className="muted small">
                @{c.username} · {new Date(c.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              {c.hidden && (
                <span className="pill" style={{ marginLeft: 6 }}>
                  {canModerate ? `Hidden${c.reportCount ? ` · ${c.reportCount} reports` : ''}` : 'Hidden by moderators'}
                </span>
              )}
              <div style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
              <div className="comment-tools">
                {canModerate && !mine && (
                  <button className="link" onClick={() => act(c.id, c.hidden ? 'SHOW' : 'HIDE')}>
                    {c.hidden ? (isAdmin ? 'Approve' : 'Unhide') : 'Hide'}
                  </button>
                )}
                {(mine || canModerate) && (
                  <button className="link" onClick={() => act(c.id, 'DELETE')}>
                    Delete
                  </button>
                )}
                {meId && !mine && !canModerate && (
                  <button className="link" disabled={reported.has(c.id)} onClick={() => act(c.id, 'REPORT')}>
                    {reported.has(c.id) ? 'Reported' : 'Report'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
