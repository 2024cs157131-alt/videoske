'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

type C = { id: string; body: string; createdAt: string; username: string };

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
        <div key={c.id} className="comment">
          <Link href={`/u/${c.username}`}>
            <strong>@{c.username}</strong>
          </Link>{' '}
          <span className="muted small">{new Date(c.createdAt).toLocaleString('en-KE')}</span>
          <div style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
        </div>
      ))}
    </div>
  );
}
