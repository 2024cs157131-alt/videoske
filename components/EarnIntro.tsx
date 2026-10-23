'use client';
import { useEffect, useState } from 'react';

const KEY = 'vk_earn_intro_seen';

// Shown once to visitors who haven't joined yet, right after they confirm they're 18+.
export default function EarnIntro({ fee, maxDaily }: { fee: number; maxDaily: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = () => {
      try {
        return localStorage.getItem(KEY) === '1';
      } catch {
        return false;
      }
    };
    const show = () => {
      if (seen()) return;
      setOpen(true);
      try {
        localStorage.setItem(KEY, '1');
      } catch {}
    };
    let ageOk = false;
    try {
      ageOk = localStorage.getItem('vk_age_ok') === '1';
    } catch {}
    if (ageOk) {
      const t = setTimeout(show, 800); // already past the 18+ screen
      return () => clearTimeout(t);
    }
    const onAge = () => setTimeout(show, 400); // opens right after "I am 18 or older"
    window.addEventListener('vk:age-ok', onAge);
    return () => window.removeEventListener('vk:age-ok', onAge);
  }, []);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-labelledby="earn-title">
      <div className="modal earn-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setOpen(false)} aria-label="Close">
          ✕
        </button>
        <div className="earn-coin">💸</div>
        <h2 id="earn-title" style={{ margin: '8px 0 4px' }}>
          Earn up to <span className="price-pop">KSh {maxDaily.toLocaleString()}</span> a day
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Post videos and stories on Vidaake and get paid straight to your <strong>M-PESA</strong>.
        </p>
        <ul className="perks">
          <li>
            <span>🎬</span> Post videos, thoughts and stories
          </li>
          <li>
            <span>👀</span> Earn from views on your free posts
          </li>
          <li>
            <span>🔒</span> Sell premium videos & posts – you keep 70%
          </li>
          <li>
            <span>📲</span> Weekly payouts to your M-PESA
          </li>
        </ul>
        <a href="/register" className="btn btn-block shine">
          Join free & start earning
        </a>
        <p className="muted small" style={{ margin: '10px 0 0' }}>
          Joining is free. Earning needs a one-time KSh {fee} creator upgrade. What you earn depends on your views and
          sales.
        </p>
        <button className="link muted small" style={{ marginTop: 8 }} onClick={() => setOpen(false)}>
          Just browsing
        </button>
      </div>
    </div>
  );
}
