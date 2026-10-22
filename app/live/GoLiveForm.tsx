'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

export default function GoLiveForm({ creatorPercent, canCharge }: { creatorPercent: number; canCharge: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [ticketPrice, setTicketPrice] = useState('0');
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
          const { id } = await postJSON<{ id: string }>('/api/live', { title, ticketPrice: canCharge ? parseInt(ticketPrice, 10) || 0 : 0 });
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
          <input
            type="number"
            min={0}
            value={canCharge ? ticketPrice : '0'}
            disabled={!canCharge}
            onChange={(e) => setTicketPrice(e.target.value)}
          />
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {canCharge ? (
          <>Paid streams: you earn {creatorPercent}% of every ticket. </>
        ) : (
          <>
            <a href="/verify" style={{ textDecoration: 'underline' }}>
              Get verified
            </a>{' '}
            to charge for your streams.{' '}
          </>
        )}
        An admin approves your stream before viewers can join.
      </p>
      {error && <div className="error">{error}</div>}
      <div>
        <button className="btn" disabled={busy}>
          {busy ? 'Starting…' : '● Start live'}
        </button>
      </div>
    </form>
  );
}
