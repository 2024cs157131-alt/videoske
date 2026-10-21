'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';
import { uploadFile } from '@/lib/upload';

export default function AdForm() {
  const router = useRouter();
  const [type, setType] = useState<'NATIVE' | 'INTERSTITIAL'>('NATIVE');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const imageUrl = image ? (await uploadFile('ad', image)).url : null;
          await postJSON('/api/admin/ads', { type, title, body, linkUrl, imageUrl });
          setMsg({ ok: true, text: 'Ad created and live.' });
          setTitle('');
          setBody('');
          setLinkUrl('');
          setImage(null);
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div>
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as 'NATIVE' | 'INTERSTITIAL')}>
            <option value="NATIVE">Native – card inside the video feed</option>
            <option value="INTERSTITIAL">Interstitial – full screen on video pages</option>
          </select>
        </div>
        <div>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required />
        </div>
        <div>
          <label>Link (https://…)</label>
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://advertiser.com" required />
        </div>
        <div>
          <label>Image (16:9 works best)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <div>
        <label>Short text (optional)</label>
        <input value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} />
      </div>
      {msg && <div className={msg.ok ? 'success' : 'error'}>{msg.text}</div>}
      <div>
        <button className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Create ad'}
        </button>
      </div>
    </form>
  );
}
