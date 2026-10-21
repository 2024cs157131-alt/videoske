'use client';
import { useState } from 'react';
import { postJSON } from '@/lib/client';
import { uploadFile } from '@/lib/upload';

type Owner = { id: string; label: string };

export default function UploadForm({
  owners,
  defaultOwner,
  priceMin,
  priceMax,
  creatorPercent,
}: {
  owners: Owner[];
  defaultOwner: string;
  priceMin: number;
  priceMax: number;
  creatorPercent: number;
}) {
  const [ownerId, setOwnerId] = useState(defaultOwner);
  const [isPremium, setIsPremium] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!video) return setError('Choose a video file.');
    setError('');
    setBusy(true);
    try {
      setStatus('Uploading video… (keep this page open)');
      const videoPath = (await uploadFile('video', video, ownerId)).path;
      let thumbPath: string | null = null;
      let previewPath: string | null = null;
      if (thumb) {
        setStatus('Uploading thumbnail…');
        thumbPath = (await uploadFile('thumb', thumb, ownerId)).path;
      }
      if (isPremium && preview) {
        setStatus('Uploading preview clip…');
        previewPath = (await uploadFile('preview', preview, ownerId)).path;
      }
      setStatus('Saving…');
      const res = await postJSON<{ id: string }>('/api/videos', {
        ownerId,
        title,
        description,
        isPremium,
        videoPath,
        thumbPath,
        previewPath,
        consent,
      });
      window.location.href = `/v/${res.id}`;
    } catch (err) {
      setError((err as Error).message);
      setStatus('');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      {owners.length > 1 && (
        <div>
          <label>Post to profile</label>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="row" style={{ alignItems: 'stretch' }}>
        <label className={`radio-card ${!isPremium ? 'on' : ''}`}>
          <input type="radio" checked={!isPremium} onChange={() => setIsPremium(false)} />
          <span>
            <strong>Free (public)</strong>
            <br />
            <span className="muted small">Anyone can watch. Free videos don’t earn.</span>
          </span>
        </label>
        <label className={`radio-card ${isPremium ? 'on' : ''}`}>
          <input type="radio" checked={isPremium} onChange={() => setIsPremium(true)} />
          <span>
            <strong>Premium (paid)</strong>
            <br />
            <span className="muted small">
              Unlocked with tokens ({priceMin}–{priceMax}, set randomly). You earn {creatorPercent}%.
            </span>
          </span>
        </label>
      </div>

      <div>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
      </div>
      <div>
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
      </div>
      <div>
        <label>Video file (MP4 recommended)</label>
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.m4v"
          onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
          required
        />
      </div>
      <div>
        <label>Thumbnail image (JPG/PNG/WebP) – shown to everyone</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
      </div>
      {isPremium && (
        <div>
          <label>Preview clip (optional, 10–30 seconds) – shown before unlocking</label>
          <input type="file" accept="video/mp4,video/webm,.m4v" onChange={(e) => setPreview(e.target.files?.[0] ?? null)} />
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I confirm everyone in this video is 18 or older and agreed to being filmed and published, the video contains{' '}
          <strong>no nudity or sexual content</strong>, and I own the rights to it.
        </span>
      </label>
      {error && <div className="error">{error}</div>}
      {status && <div className="success">{status}</div>}
      <button className="btn" disabled={busy || !consent}>
        {busy ? 'Uploading…' : 'Upload video'}
      </button>
    </form>
  );
}
