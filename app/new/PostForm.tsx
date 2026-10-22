'use client';
import { useState } from 'react';
import { postJSON } from '@/lib/client';
import { uploadFile } from '@/lib/upload';
import { openUpgrade } from '@/components/UpgradeModal';

export default function PostForm({
  canPremium,
  verified,
  priceMin,
  priceMax,
  viewsRate,
  creatorPercent,
}: {
  canPremium: boolean;
  verified: boolean;
  priceMin: number;
  priceMax: number;
  viewsRate: number;
  creatorPercent: number;
}) {
  const [body, setBody] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [sensitive, setSensitive] = useState(false);
  const [original, setOriginal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const max = 5000;

  return (
    <form
      className="stack"
      style={{ marginTop: 14 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const imagePath = image ? (await uploadFile(isPremium ? 'postimg_private' : 'postimg', image)).path : null;
          const { id, notified } = await postJSON<{ id: string; notified: number }>('/api/posts', { body, isPremium, sensitive, original, imagePath });
          window.location.href = `/v/${id}?posted=1&notified=${notified}`;
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <div>
        <textarea
          rows={7}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={max}
          placeholder="Tell your story… The first line becomes the title."
          required
          autoFocus
        />
        <div className="muted small" style={{ textAlign: 'right' }}>
          {body.length.toLocaleString()} / {max.toLocaleString()}
        </div>
      </div>
      <div>
        <label>Photo (optional)</label>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
      </div>

      <div className="row" style={{ alignItems: 'stretch' }}>
        <label className={`radio-card ${!isPremium ? 'on' : ''}`}>
          <input type="radio" checked={!isPremium} onChange={() => setIsPremium(false)} />
          <span>
            <strong>Free</strong>
            <br />
            <span className="muted small">
              Everyone can read it.{' '}
              {verified ? `You earn KSh ${viewsRate} per 1,000 views.` : `Verified creators earn KSh ${viewsRate} per 1,000 views.`}
            </span>
          </span>
        </label>
        <label
          className={`radio-card ${isPremium ? 'on' : ''}`}
          onClick={(e) => {
            if (!canPremium) {
              e.preventDefault();
              openUpgrade();
            }
          }}
        >
          <input type="radio" checked={isPremium} disabled={!canPremium} onChange={() => setIsPremium(true)} />
          <span>
            <strong>Premium {!canPremium && '🔒'}</strong>
            <br />
            <span className="muted small">
              Locked – readers unlock it (KSh {priceMin}–{priceMax}). You keep {creatorPercent}%.
              {!canPremium && ' Tap to get verified.'}
            </span>
          </span>
        </label>
      </div>

      <label className="check">
        <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} />
        <span>
          <strong>Mark as sensitive</strong> – mature themes. An admin reviews it before it’s published, and readers see a
          warning first.
        </span>
      </label>
      <label className="check original-consent">
        <input type="checkbox" checked={original} onChange={(e) => setOriginal(e.target.checked)} />
        <span>
          <strong>This is my own post.</strong> It isn’t copied from someone else. Copied content gets accounts banned.
        </span>
      </label>
      {error && <div className="error">{error}</div>}
      <button className="btn" disabled={busy || !original || body.trim().length < 3}>
        {busy ? 'Posting…' : sensitive ? 'Send for review' : 'Post'}
      </button>
    </form>
  );
}
