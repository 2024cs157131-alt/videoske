'use client';
import { useState } from 'react';
import Link from 'next/link';
import { postJSON } from '@/lib/client';

export default function LoginForm({ next }: { next: string }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await postJSON('/api/auth/login', { identifier, password });
      window.location.href = next;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="narrow card-panel">
      <h1>Log in</h1>
      <form onSubmit={submit} className="stack">
        <div>
          <label>Username or email</label>
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="muted">
          New here? <Link href="/register" style={{ textDecoration: 'underline' }}>Create an account</Link>
        </p>
      </form>
    </div>
  );
}
