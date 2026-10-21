'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

export default function UnlockForm({
  videoId,
  price,
  tillNumber,
  tillName,
  loggedIn,
}: {
  videoId: string;
  price: number;
  tillNumber: string;
  tillName: string;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await postJSON(`/api/videos/${videoId}/unlock`, { message });
      setDone(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-panel stack">
      <h2 style={{ margin: 0 }}>Unlock this video – Ksh {price}</h2>
      <ol className="pay-steps">
        <li>Open M-PESA → <strong>Lipa na M-PESA</strong> → <strong>Buy Goods and Services</strong></li>
        <li>
          Till number: <span className="till">{tillNumber}</span> ({tillName})
        </li>
        <li>
          Amount: <strong>Ksh {price}</strong> exactly
        </li>
        <li>Paste the full confirmation SMS from M-PESA below and press Unlock</li>
      </ol>

      {!loggedIn ? (
        <p>
          <Link href={`/login?next=/v/${videoId}`} className="btn">
            Log in to unlock
          </Link>
        </p>
      ) : (
        <form onSubmit={submit} className="stack">
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`e.g. TJK4ABC12D Confirmed. Ksh${price}.00 paid to ${tillName}. on 21/10/26 at 5:12 AM. New M-PESA balance is ...`}
            required
          />
          {error && <div className="error">{error}</div>}
          {done && <div className="success">Payment verified – enjoy the video!</div>}
          <button className="btn" disabled={busy || message.trim().length < 30}>
            {busy ? 'Checking payment…' : 'Unlock video'}
          </button>
        </form>
      )}
    </div>
  );
}
