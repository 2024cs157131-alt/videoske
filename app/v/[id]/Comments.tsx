'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

type C = {
  id: string;
  body: string;
  createdAt: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
};

export default function Comments({ videoId, comments, canComment }: { videoId: string; comments: C[]; canComment: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="card-panel">
      <h2 style={{ marginTop: 0 }}>Comments ({comments.length})</h2>
      {canComment && (
        <form onSubmit={submit} className="row" style={{ marginBottom: 12 }}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Say something…" maxLength={1000} style={{ flex: 1 }} />
          <button className="btn small" disabled={busy}>
            Post
          </button>
        </form>
      )}
      {comments.length === 0 && <p className="muted">No comments yet.</p>}
      {comments.map((c) => (
        <div key={c.id} className="comment fade-in">
          <Link href={`/u/${c.username}`} className="comment-avatar" aria-hidden>
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt="" className="avatar" style={{ width: 32, height: 32 }} />
            ) : (
              <span className="avatar avatar-initials" style={{ width: 32, height: 32, fontSize: 13, background: '#2b6cdf' }}>
                {(c.displayName || c.username)[0]?.toUpperCase()}
              </span>
            )}
          </Link>
          <div style={{ minWidth: 0 }}>
            <Link href={`/u/${c.username}`}>
              <strong>{c.displayName}</strong>
            </Link>{' '}
            {c.verified && <span title="Verified creator" style={{ color: '#1d9bf0' }}>✓</span>}{' '}
            <span className="muted small">
              @{c.username} · {new Date(c.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            <div style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
