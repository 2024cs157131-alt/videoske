'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

export default function GoLiveForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="row"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const { id } = await postJSON<{ id: string }>('/api/live', { title });
          router.push(`/live/${id}`);
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Stream title" maxLength={100} required style={{ flex: 1, minWidth: 200 }} />
      <button className="btn" disabled={busy}>
        {busy ? 'Starting…' : '● Start live'}
      </button>
      {error && <div className="error" style={{ width: '100%' }}>{error}</div>}
    </form>
  );
}
