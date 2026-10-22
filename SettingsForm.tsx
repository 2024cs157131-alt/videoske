'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';
import type { Settings } from '@/lib/settings';

const YES_NO: Partial<Record<keyof Settings, [string, string]>> = {
  usd_enabled: ['No – everyone pays in KES (foreign cards still work)', 'Yes – non-Kenyans pay in USD'],
  auto_publish: ['No – I review every video first', 'Yes – videos go live straight away'],
  auto_approve_live: ['No – I approve each live stream', 'Yes – streams go live straight away'],
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FIELDS: { key: keyof Settings; label: string; type?: 'select' | 'day' }[] = [
  { key: 'verification_fee_kes', label: 'Creator verification fee (KSh)' },
  { key: 'views_rate', label: 'Verified creators earn per 1,000 unique views (KSh)' },
  { key: 'auto_publish', label: 'Publish videos without review', type: 'select' },
  { key: 'auto_hide_reports', label: 'Auto-hide a video after N reports (0 = never)' },
  { key: 'auto_approve_live', label: 'Live streams without approval', type: 'select' },
  { key: 'token_price_kes', label: 'KSh per token' },
  { key: 'usd_rate', label: 'Conversion rate: KSh per 1 USD' },
  { key: 'token_packages', label: 'Token packages (comma separated)' },
  { key: 'usd_enabled', label: 'Charge non-Kenyans in USD', type: 'select' },
  { key: 'price_min', label: 'Premium video min price (tokens)' },
  { key: 'price_max', label: 'Premium video max price (tokens)' },
  { key: 'commission_percent', label: 'Your commission (%)' },
  { key: 'payout_min_tokens', label: 'Minimum weekly withdrawal (KSh)' },
  { key: 'payout_hold_days', label: 'Earnings clear after (days)' },
  { key: 'payout_weekday', label: 'Weekly payout day', type: 'day' },
  { key: 'referral_reward', label: 'Referral reward per active member (tokens = KSh)' },
  { key: 'referral_min_purchase', label: 'Referred member is active after buying (tokens)' },
  { key: 'native_ad_every', label: 'Native ad after every N videos (0 = off)' },
  { key: 'interstitial_minutes', label: 'Interstitial at most every N minutes (0 = off)' },
];

export default function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

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
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label>{f.label}</label>
            {f.type === 'day' ? (
              <select value={s[f.key]} onChange={(e) => setS({ ...s, [f.key]: e.target.value })}>
                {DAYS.map((d, i) => (
                  <option key={d} value={String(i)}>
                    {d}
                  </option>
                ))}
              </select>
            ) : f.type === 'select' ? (
              <select value={s[f.key]} onChange={(e) => setS({ ...s, [f.key]: e.target.value })}>
                <option value="false">{YES_NO[f.key]?.[0] ?? 'No'}</option>
                <option value="true">{YES_NO[f.key]?.[1] ?? 'Yes'}</option>
              </select>
            ) : (
              <input value={s[f.key]} onChange={(e) => setS({ ...s, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
      </div>
      <p className="muted small">
        Visitors outside Kenya see prices in USD, converted with your rate (e.g. 130 → 200 tokens ≈ $1.54). Update the
        rate when the shilling moves. Turn on “charge in USD” only after Paystack has enabled USD on your account.
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
