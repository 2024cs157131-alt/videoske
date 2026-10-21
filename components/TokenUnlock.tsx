'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

// "Unlock for N tokens" box used for premium videos and paid live streams
export default function TokenUnlock({
  url,
  price,
  priceText,
  balance,
  loggedIn,
  what,
  loginNext,
}: {
  url: string;
  price: number;
  priceText: string; // "KSh 175" or "$1.35"
  balance: number;
  loggedIn: boolean;
  what: string;
  loginNext: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const enough = balance >= price;

  async function unlock() {
    setBusy(true);
    setError('');
    try {
      await postJSON(url);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="card-panel stack">
      <h2 style={{ margin: 0 }}>
        Unlock {what} – {priceText}
      </h2>
      <p className="muted" style={{ margin: 0 }}>
        🪙 {price} tokens
        {loggedIn && (
          <>
            {' '}
            · Your balance: <strong>🪙 {balance}</strong>
          </>
        )}
      </p>
      {!loggedIn ? (
        <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="btn" style={{ alignSelf: 'flex-start' }}>
          Log in to unlock
        </Link>
      ) : (
        <>
          {error && <div className="error">{error}</div>}
          <div className="row">
            {enough ? (
              <button className="btn" onClick={unlock} disabled={busy}>
                {busy ? 'Unlocking…' : `Unlock for ${price} tokens`}
              </button>
            ) : (
              <Link href="/wallet" className="btn">
                Buy tokens (need {price - balance} more)
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
