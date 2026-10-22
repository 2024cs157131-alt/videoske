'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { postJSON } from '@/lib/client';

export default function RegisterPage() {
  const [f, setF] = useState({ username: '', displayName: '', email: '', password: '', dob: '' });
  const [check, setCheck] = useState<{ available: boolean; message: string } | null>(null);

  // Live username check while typing (each username can only be used once)
  useEffect(() => {
    const u = f.username.trim();
    if (u.length < 3) return setCheck(null);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/auth/username?u=${encodeURIComponent(u)}`);
        setCheck(await r.json());
      } catch {}
    }, 350);
    return () => clearTimeout(t);
  }, [f.username]);
  const [confirmAge, setConfirmAge] = useState(false);
  const [consent, setConsent] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  // Latest allowed birth date = today minus 18 years
  const max = new Date();
  max.setFullYear(max.getFullYear() - 18);
  const maxDob = max.toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      let ref = new URLSearchParams(window.location.search).get('ref') || '';
      try {
        ref = ref || localStorage.getItem('vk_ref') || '';
      } catch {}
      await postJSON('/api/auth/register', { ...f, confirmAge, consent, terms, ref });
      window.location.href = '/?welcome=1';
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="narrow card-panel">
      <h1>Create account (18+)</h1>
      <form onSubmit={submit} className="stack">
        <div>
          <label>Username</label>
          <input
            value={f.username}
            onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
            placeholder="e.g. jane_k"
            maxLength={20}
            autoCapitalize="none"
            autoComplete="username"
            required
          />
          {check && (
            <div className={`small ${check.available ? 'ok-text' : 'bad-text'}`} style={{ marginTop: 4 }}>
              {check.message}
            </div>
          )}
        </div>
        <div>
          <label>Display name</label>
          <input value={f.displayName} onChange={set('displayName')} placeholder="Jane" />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={f.email} onChange={set('email')} required />
        </div>
        <div>
          <label>Password (min 8 characters)</label>
          <input type="password" value={f.password} onChange={set('password')} minLength={8} required />
        </div>
        <div>
          <label>Date of birth</label>
          <input type="date" value={f.dob} onChange={set('dob')} max={maxDob} required />
        </div>

        <label className="check">
          <input type="checkbox" checked={confirmAge} onChange={(e) => setConfirmAge(e.target.checked)} />
          <span>I confirm I am 18 years of age or older.</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I consent to viewing age-restricted content and to my details being stored to run my account.</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>
            I accept the <Link href="/terms" style={{ textDecoration: 'underline' }}>terms &amp; consent policy</Link>.
          </span>
        </label>

        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={busy || !confirmAge || !consent || !terms || check?.available === false}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="muted">
          Already registered? <Link href="/login" style={{ textDecoration: 'underline' }}>Log in</Link>
        </p>
      </form>
    </div>
  );
}
