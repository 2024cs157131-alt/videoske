'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';
import type { Settings } from '@/lib/settings';

export default function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setS({ ...s, [k]: e.target.value });

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          await postJSON('/api/admin/settings', s);
          setMsg({ ok: true, text: 'Saved.' });
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
          <label>Till number</label>
          <input value={s.till_number} onChange={set('till_number')} inputMode="numeric" />
        </div>
        <div>
          <label>Till name (as shown in SMS)</label>
          <input value={s.till_name} onChange={set('till_name')} />
        </div>
        <div>
          <label>Min price (Ksh)</label>
          <input type="number" value={s.price_min} onChange={set('price_min')} />
        </div>
        <div>
          <label>Max price (Ksh)</label>
          <input type="number" value={s.price_max} onChange={set('price_max')} />
        </div>
        <div>
          <label>Accept payments made within (hours)</label>
          <input type="number" value={s.payment_max_age_hours} onChange={set('payment_max_age_hours')} />
        </div>
        <div>
          <label>Require Safaricom (Daraja) match</label>
          <select value={s.daraja_required} onChange={set('daraja_required')}>
            <option value="false">No – check SMS text only</option>
            <option value="true">Yes – code must exist in M-PESA callback</option>
          </select>
        </div>
      </div>
      <p className="muted small">
        New prices apply to new uploads. Turn on the Daraja match once C2B callbacks are working – it stops people
        unlocking with typed-up fake messages.
      </p>
      {msg && <div className={msg.ok ? 'success' : 'error'}>{msg.text}</div>}
      <div>
        <button className="btn" disabled={busy}>
          Save settings
        </button>
      </div>
    </form>
  );
}
