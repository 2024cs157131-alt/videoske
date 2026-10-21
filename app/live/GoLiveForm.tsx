'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

export default function GoLiveForm({ creatorPercent }: { creatorPercent: number }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [ticketPrice, setTicketPrice] = useState('0');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const { id } = await postJSON<{ id: string }>('/api/live', { title, ticketPrice: parseInt(ticketPrice, 10) || 0, consent });
          router.push(`/live/${id}`);
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <div className="row">
        <div style={{ flex: '2 1 220px' }}>
          <label>Stream title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label>Ticket price (tokens = KSh, 0 = free)</label>
          <input type="number" min={0} value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} />
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Paid streams: you earn {creatorPercent}% of every ticket.
      </p>
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>I’m 18+ and my stream will contain no nudity or sexual content.</span>
      </label>
      {error && <div className="error">{error}</div>}
      <div>
        <button className="btn" disabled={busy || !consent}>
          {busy ? 'Starting…' : '● Start live'}
        </button>
      </div>
    </form>
  );
}
