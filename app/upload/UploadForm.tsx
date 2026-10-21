'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { postJSON } from '@/lib/client';

type Owner = { id: string; label: string };
type Kind = 'video' | 'thumb' | 'preview';

async function uploadFile(kind: Kind, file: File, ownerId: string) {
  const s = await postJSON<{ bucket: string; path: string; token: string }>('/api/uploads/sign', {
    kind,
    filename: file.name,
    ownerId,
  });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await sb.storage.from(s.bucket).uploadToSignedUrl(s.path, s.token, file, {
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return s.path;
}

export default function UploadForm({ owners, defaultOwner }: { owners: Owner[]; defaultOwner: string }) {
  const [ownerId, setOwnerId] = useState(defaultOwner);
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
      const videoPath = await uploadFile('video', video, ownerId);
      let thumbPath: string | null = null;
      let previewPath: string | null = null;
      if (thumb) {
        setStatus('Uploading thumbnail…');
        thumbPath = await uploadFile('thumb', thumb, ownerId);
      }
      if (preview) {
        setStatus('Uploading preview clip…');
        previewPath = await uploadFile('preview', preview, ownerId);
      }
      setStatus('Saving…');
      const res = await postJSON<{ id: string }>('/api/videos', {
        ownerId,
        title,
        description,
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
      <div>
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
      </div>
      <div>
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
      </div>
      <div>
        <label>Full video (MP4 recommended) – only buyers can watch this</label>
        <input type="file" accept="video/mp4,video/webm,video/quicktime,.m4v" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} required />
      </div>
      <div>
        <label>Thumbnail image (JPG/PNG/WebP) – shown to everyone</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
      </div>
      <div>
        <label>Preview clip (optional, 10–30 seconds, MP4/WebM) – shown to everyone</label>
        <input type="file" accept="video/mp4,video/webm,.m4v" onChange={(e) => setPreview(e.target.files?.[0] ?? null)} />
      </div>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          I confirm that every person in this video is 18 or older, consented to being filmed and to this video being
          published and sold on VideosKE, and that I own the rights to it.
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
