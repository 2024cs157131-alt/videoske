'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

export default function CreateProfileForm() {
  const router = useRouter();
  const [f, setF] = useState({ username: '', displayName: '', bio: '', dob: '' });
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const r = await postJSON<{ username: string }>('/api/admin/profiles', { ...f, consent });
          setMsg({ ok: true, text: `Profile @${r.username} created. Use “+ Add video” to upload.` });
          setF({ username: '', displayName: '', bio: '', dob: '' });
          setConsent(false);
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div>
          <label>Username</label>
          <input value={f.username} onChange={set('username')} required />
        </div>
        <div>
          <label>Display name</label>
          <input value={f.displayName} onChange={set('displayName')} required />
        </div>
        <div>
          <label>Date of birth</label>
          <input type="date" value={f.dob} onChange={set('dob')} required />
        </div>
        <div>
          <label>Bio</label>
          <input value={f.bio} onChange={set('bio')} />
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I have checked this person’s ID (18+) and hold their written consent to publish and sell their videos.</span>
      </label>
      {msg && <div className={msg.ok ? 'success' : 'error'}>{msg.text}</div>}
      <div>
        <button className="btn" disabled={busy || !consent}>
          Create profile
        </button>
      </div>
    </form>
  );
}
