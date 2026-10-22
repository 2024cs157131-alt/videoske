'use client';
import { useState } from 'react';
import { postJSON } from '@/lib/client';

export default function VerifyForm({ kenya }: { kenya: boolean }) {
  const [f, setF] = useState({ name: '', phone: '', bank: '', account: '', swift: '', country: '' });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          const { url } = await postJSON<{ url: string }>('/api/verify/checkout', f);
          window.location.href = url; // Paystack checkout
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <h2 style={{ margin: 0 }}>Your payout details</h2>
      <div>
        <label>Full name (as registered on {kenya ? 'M-PESA' : 'your bank account'})</label>
        <input value={f.name} onChange={set('name')} required />
      </div>
      {kenya ? (
        <>
          <div>
            <label>M-PESA number</label>
            <input value={f.phone} onChange={set('phone')} placeholder="0712345678" inputMode="tel" required />
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            Pay the fee from this same number. The M-PESA number that pays is saved as your payout number – all your
            earnings are sent there.
          </p>
        </>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div>
            <label>Bank name</label>
            <input value={f.bank} onChange={set('bank')} required />
          </div>
          <div>
            <label>Account number / IBAN</label>
            <input value={f.account} onChange={set('account')} required />
          </div>
          <div>
            <label>SWIFT / BIC (optional)</label>
            <input value={f.swift} onChange={set('swift')} />
          </div>
          <div>
            <label>Country</label>
            <input value={f.country} onChange={set('country')} required />
          </div>
        </div>
      )}
      <label className="check">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          These details are mine and correct. I understand earnings are only paid to these details and changing them
          needs an admin. The fee is non-refundable.
        </span>
      </label>
      {error && <div className="error">{error}</div>}
      <button className="btn" disabled={busy || !agree}>
        {busy ? 'Opening payment…' : kenya ? 'Pay with M-PESA' : 'Pay by card'}
      </button>
    </form>
  );
}
