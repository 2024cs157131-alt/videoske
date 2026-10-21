'use client';
import { useState } from 'react';
import { postJSON } from '@/lib/client';

// shown = price in the visitor's currency ("KSh 500" / "$3.85"); charged = what the card is billed if different
type Pkg = { tokens: number; shown: string; charged: string | null };

export default function BuyTokens({ packages }: { packages: Pkg[] }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function buy(tokens: number) {
    setBusy(tokens);
    setError('');
    try {
      const { url } = await postJSON<{ url: string }>('/api/tokens/checkout', { tokens });
      window.location.href = url; // Paystack checkout
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div className="packages">
        {packages.map((p) => (
          <div key={p.tokens} className="package">
            <strong>🪙 {p.tokens.toLocaleString()}</strong>
            <span>{p.shown}</span>
            {p.charged && <div className="muted small">billed as {p.charged}</div>}
            <button className="btn small" disabled={busy !== null} onClick={() => buy(p.tokens)}>
              {busy === p.tokens ? 'Opening…' : 'Buy'}
            </button>
          </div>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
