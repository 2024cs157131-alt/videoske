'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const KEY = 'vk_upgrade_seen';

/** Open the upgrade modal from anywhere: openUpgrade() */
export function openUpgrade() {
  window.dispatchEvent(new Event('vk:upgrade'));
}

// "Get verified" modal for free users. Opens automatically once a day, and whenever a free user
// tries something only verified creators can do (premium uploads, earning).
export default function UpgradeModal({ fee, viewsRate, creatorPercent }: { fee: string; viewsRate: number; creatorPercent: number }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('vk:upgrade', show);
    // Automatic: at most once a day, never on the verify/payment pages
    if (!path.startsWith('/verify') && !path.startsWith('/wallet')) {
      try {
        const last = parseInt(localStorage.getItem(KEY) || '0', 10);
        if (Date.now() - last > 86_400_000) {
          const t = setTimeout(() => {
            setOpen(true);
            localStorage.setItem(KEY, String(Date.now()));
          }, 4000);
          return () => {
            clearTimeout(t);
            window.removeEventListener('vk:upgrade', show);
          };
        }
      } catch {}
    }
    return () => window.removeEventListener('vk:upgrade', show);
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
          Start earning on Vidaake
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Upgrade once for <strong className="price-pop">{fee}</strong> and become a verified creator.
        </p>
        <ul className="perks">
          <li>
            <span>🔒</span> Post <strong>premium videos & posts</strong> – you keep {creatorPercent}% of every sale
          </li>
          <li>
            <span>👀</span> Earn <strong>KSh {viewsRate}</strong> per 1,000 views on your free videos & posts
          </li>
          <li>
            <span>💸</span> Weekly payouts to your M-PESA
          </li>
          <li>
            <span>✓</span> Blue verified badge on your profile
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
