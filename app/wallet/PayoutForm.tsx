'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

export default function PayoutForm({
  earned,
  min,
  kesPerToken,
  verified,
  destination,
}: {
  earned: number;
  min: number;
  kesPerToken: number;
  verified: boolean;
  destination: string | null; // e.g. "M-PESA 254712345678 (Jane Doe)"
}) {
  const router = useRouter();
  const [tokens, setTokens] = useState(String(earned >= min ? earned : min));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!verified) {
    return (
      <p>
        <Link href="/verify" className="btn small">
          Get verified to withdraw
        </Link>
      </p>
    );
  }
  if (earned < min) {
    return (
      <p className="muted">
        You have {earned} earned tokens. You can withdraw once you reach {min}. Payouts go to <strong>{destination}</strong>.
      </p>
    );
  }

  return (
    <form
      className="row"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          await postJSON('/api/payouts', { tokens: parseInt(tokens, 10) });
          setMsg({ ok: true, text: 'Withdrawal requested.' });
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div style={{ flex: '1 1 160px' }}>
        <label>Tokens (≈ KSh {Math.floor((parseInt(tokens, 10) || 0) * kesPerToken).toLocaleString()})</label>
        <input type="number" min={min} max={earned} value={tokens} onChange={(e) => setTokens(e.target.value)} />
      </div>
      <div style={{ flex: '2 1 220px' }}>
        <label>Paid to (saved at verification)</label>
        <input value={destination ?? ''} readOnly />
      </div>
      <button className="btn" disabled={busy} style={{ alignSelf: 'flex-end' }}>
        Request withdrawal
      </button>
      {msg && (
        <div className={msg.ok ? 'success' : 'error'} style={{ width: '100%' }}>
          {msg.text}
        </div>
      )}
    </form>
  );
}
