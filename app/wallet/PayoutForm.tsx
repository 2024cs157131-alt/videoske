'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

export default function PayoutForm({
  available,
  min,
  kesPerToken,
  verified,
  destination,
  nextRequest,
  payoutDay,
}: {
  available: number; // cleared earnings (tokens = KSh)
  min: number;
  kesPerToken: number;
  verified: boolean;
  destination: string | null; // e.g. "M-PESA 254712345678 (Jane Doe)"
  nextRequest: string | null; // already requested this week → date of the next allowed request
  payoutDay: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ksh = (t: number) => `KSh ${Math.floor(t * kesPerToken).toLocaleString()}`;

  if (!verified) {
    return (
      <p>
        <Link href="/verify" className="btn small">
          Get verified to withdraw
        </Link>
      </p>
    );
  }
  if (nextRequest) {
    return (
      <p className="success">
        ✓ You’ve requested this week’s payout – it’s sent on {payoutDay}. Your next request opens {nextRequest}.
      </p>
    );
  }
  if (available < min) {
    const pct = Math.min(100, Math.round((available / min) * 100));
    return (
      <div className="stack">
        <div className="progress" aria-label={`${pct}% of the minimum`}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {ksh(available)} of {ksh(min)} available – keep earning! Payouts go to <strong>{destination}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="row">
      <div style={{ flex: '2 1 240px' }}>
        <strong>{ksh(available)}</strong> ready to withdraw
        <div className="muted small">To {destination} · sent on {payoutDay}</div>
      </div>
      <button
        className="btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try {
            await postJSON('/api/payouts', { tokens: available });
            setMsg({ ok: true, text: `Requested – you’ll be paid on ${payoutDay}.` });
            router.refresh();
          } catch (err) {
            setMsg({ ok: false, text: (err as Error).message });
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Requesting…' : `Request ${ksh(available)}`}
      </button>
      {msg && (
        <div className={msg.ok ? 'success' : 'error'} style={{ width: '100%' }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
