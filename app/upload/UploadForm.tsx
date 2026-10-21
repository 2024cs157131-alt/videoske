'use client';
import { useState } from 'react';
import { postJSON } from '@/lib/client';
import { uploadFile } from '@/lib/upload';
import { makeThumbnail, makeTrailer } from '@/lib/media';

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
  const [consent, setConsent] = useState(false);
  const [sensitive, setSensitive] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!video) return setError('Choose a video file.');
    setError('');
    setBusy(true);
    try {
      setStatus(isPremium ? 'Uploading video and making the trailer… keep this page open' : 'Uploading video… keep this page open');

      // Upload the full video while the browser makes the thumbnail and (premium only) the trailer
      const [videoRes, thumbFile, trailerFile] = await Promise.all([
        uploadFile('video', video, ownerId),
        thumb ? Promise.resolve(thumb) : makeThumbnail(video),
        isPremium ? makeTrailer(video) : Promise.resolve(null),
      ]);

      let thumbPath: string | null = null;
      let previewPath: string | null = null;
      if (thumbFile) {
        setStatus('Uploading thumbnail…');
        thumbPath = (await uploadFile('thumb', thumbFile, ownerId)).path;
      }
      if (trailerFile) {
        setStatus('Uploading trailer…');
        previewPath = (await uploadFile('preview', trailerFile, ownerId)).path;
      }

      setStatus('Saving…');
      const res = await postJSON<{ id: string }>('/api/videos', {
        ownerId,
        title,
        description,
        isPremium,
        videoPath: videoRes.path,
        thumbPath,
        previewPath,
        consent,
        sensitive,
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
            <span className="muted small">Anyone can watch. Shown with a normal thumbnail. Free videos don’t earn.</span>
          </span>
        </label>
        <label className={`radio-card ${isPremium ? 'on' : ''}`}>
          <input type="radio" checked={isPremium} onChange={() => setIsPremium(true)} />
          <span>
            <strong>Premium (paid)</strong>
            <br />
            <span className="muted small">
              Unlocked with tokens (KSh {priceMin}–{priceMax}, set randomly). A greyed-out 8-second trailer is made
              automatically. You earn {creatorPercent}%.
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
        <label>Thumbnail image (optional – we take one from the video if you skip this)</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
      </div>
      <label className="check">
        <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} />
        <span>
          <strong>Add a content warning</strong> – mature content such as strong language, violence or partying. Viewers
          tap “Show” before it plays.
        </span>
      </label>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I confirm everyone in this video is 18 or older and agreed to being filmed and published, and I own the rights
          to it. Sexual content isn’t allowed and is deleted when reported.
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
