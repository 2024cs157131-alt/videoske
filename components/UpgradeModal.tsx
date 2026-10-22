'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const KEY = 'vk_upgrade_shown'; // per visit (browser session)

/** Open the upgrade modal from anywhere: openUpgrade() */
export function openUpgrade() {
  window.dispatchEvent(new Event('vk:upgrade'));
}

// "Get verified" modal for members who haven't upgraded yet. Opens every time they come into the app
// (once per visit – not on every page), and whenever they try something only verified creators can do.
export default function UpgradeModal({ fee, viewsRate, creatorPercent }: { fee: string; viewsRate: number; creatorPercent: number }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  // Opened by buttons (Premium option, etc.)
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('vk:upgrade', show);
    return () => window.removeEventListener('vk:upgrade', show);
  }, []);

  // Opened automatically once per visit, a moment after they arrive (never on the payment pages)
  useEffect(() => {
    if (path.startsWith('/verify') || path.startsWith('/wallet')) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
    } catch {}
    if (seen) return;
    const t = setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(KEY, '1');
      } catch {}
    }, 2500);
    return () => clearTimeout(t);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setOpen(false)} aria-label="Close">
          ✕
        </button>
        <div className="modal-badge">✓</div>
        <h2 id="upgrade-title" style={{ margin: '6px 0 4px' }}>
          Get your verified badge
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Upgrade once for <strong className="price-pop">{fee}</strong> and start earning on Vidaake.
        </p>
        <ul className="perks">
          <li>
            <span>✓</span> Blue verified badge on your profile, videos and posts
          </li>
          <li>
            <span>🔒</span> Post <strong>premium videos & posts</strong> – you keep {creatorPercent}% of every sale
          </li>
          <li>
            <span>👀</span> Earn <strong>KSh {viewsRate}</strong> per 1,000 views on your free videos & posts
          </li>
          <li>
            <span>💸</span> Weekly payouts to your M-PESA
          </li>
        </ul>
        <a href="/verify" className="btn btn-block shine">
          Get verified – {fee}
        </a>
        <button className="link muted small" style={{ marginTop: 10 }} onClick={() => setOpen(false)}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
