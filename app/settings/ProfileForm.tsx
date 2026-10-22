'use client';
import { useEffect, useState } from 'react';
import { postJSON } from '@/lib/client';
import { uploadFile } from '@/lib/upload';

/** Crop to a centred square and shrink to 400×400 JPEG in the browser (small, fast-loading pictures). */
async function squareJpeg(file: File): Promise<File> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const c = document.createElement('canvas');
  c.width = c.height = 400;
  c.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 400, 400);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85));
  return blob ? new File([blob], 'avatar.jpg', { type: 'image/jpeg' }) : file;
}

export default function ProfileForm({
  username,
  displayName: initialName,
  bio: initialBio,
  avatarUrl,
}: {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          let avatarPath: string | undefined;
          if (file) {
            const small = await squareJpeg(file).catch(() => file);
            avatarPath = (await uploadFile('avatar', small)).path;
          }
          await postJSON('/api/profile', { displayName, bio, avatarPath, removeAvatar: remove && !file });
          window.location.href = `/u/${username}`;
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
          setBusy(false);
        }
      }}
    >
      <div className="avatar-edit">
        {preview && !remove ? (
          <img src={preview} alt="" className="avatar" style={{ width: 110, height: 110 }} />
        ) : (
          <span className="avatar avatar-initials" style={{ width: 110, height: 110, fontSize: 42, background: '#2b6cdf' }}>
            {(displayName || username)[0]?.toUpperCase()}
          </span>
        )}
        <div className="stack" style={{ flex: 1 }}>
          <label className="btn small ghost" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
            📷 {preview && !remove ? 'Change picture' : 'Add a profile picture'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setRemove(false);
              }}
            />
          </label>
          {preview && !remove && (
            <button
              type="button"
              className="link muted small"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => {
                setRemove(true);
                setFile(null);
              }}
            >
              Remove picture
            </button>
          )}
        </div>
      </div>
      <div>
        <label>Display name</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} required />
      </div>
      <div>
        <label>Bio</label>
        <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="Tell people about yourself" />
      </div>
      {msg && <div className={msg.ok ? 'success' : 'error'}>{msg.text}</div>}
      <button className="btn" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
