'use client';
import { useState } from 'react';
import { postJSON } from '@/lib/client';

export type ActionState = {
  id: string;
  likes: number;
  liked: boolean;
  comments: number;
  reshares: number;
  reshared: boolean;
};

const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n ? String(n) : '');

// ❤ Like · 💬 Comment · 🔁 Reshare · ↗ Share – under every video/post
export default function ActionBar({
  s,
  loggedIn,
  isOwn,
  shareUrl,
  title,
  big,
}: {
  s: ActionState;
  loggedIn: boolean;
  isOwn: boolean;
  shareUrl: string;
  title: string;
  big?: boolean;
}) {
  const [liked, setLiked] = useState(s.liked);
  const [likes, setLikes] = useState(s.likes);
  const [reshared, setReshared] = useState(s.reshared);
  const [reshares, setReshares] = useState(s.reshares);
  const [pop, setPop] = useState<'like' | 'reshare' | null>(null);
  const [copied, setCopied] = useState(false);

  const needLogin = () => {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  };

  async function toggleLike() {
    if (!loggedIn) return needLogin();
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    if (next) setPop('like');
    try {
      const r = await postJSON<{ count: number }>(`/api/videos/${s.id}/like`, { like: next });
      setLikes(r.count);
    } catch {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    }
  }

  async function toggleReshare() {
    if (!loggedIn) return needLogin();
    if (isOwn) return alert('This is yours – use Share to post it on WhatsApp, Facebook or X.');
    const next = !reshared;
    setReshared(next);
    setReshares((n) => n + (next ? 1 : -1));
    if (next) setPop('reshare');
    try {
      const r = await postJSON<{ count: number }>(`/api/videos/${s.id}/reshare`, { reshare: next });
      setReshares(r.count);
    } catch (e) {
      setReshared(!next);
      setReshares((n) => n + (next ? -1 : 1));
      alert((e as Error).message);
    }
  }

  async function share() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className={`actions ${big ? 'big' : ''}`} onAnimationEnd={() => setPop(null)}>
      <button className={`act ${liked ? 'on like' : ''}`} onClick={toggleLike} aria-pressed={liked} aria-label="Like">
        <span className={pop === 'like' ? 'pop' : ''}>{liked ? '❤️' : '🤍'}</span> {fmt(likes)}
      </button>
      <a className="act" href={`/v/${s.id}#comments`} aria-label="Comments">
        <span>💬</span> {fmt(s.comments)}
      </a>
      <button className={`act ${reshared ? 'on reshare' : ''}`} onClick={toggleReshare} aria-pressed={reshared} aria-label="Reshare">
        <span className={pop === 'reshare' ? 'pop spin' : ''}>🔁</span> {fmt(reshares)}
      </button>
      <button className="act" onClick={share} aria-label="Share">
        <span>↗</span> {copied ? 'Copied' : big ? 'Share' : ''}
      </button>
    </div>
  );
}
