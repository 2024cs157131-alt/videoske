'use client';
import { useEffect, useState } from 'react';

type AdLite = { id: string; title: string; body: string | null; imageUrl: string | null };
const KEY = 'vk_interstitial_at';
const SKIP_AFTER = 5; // seconds

// Full-screen ad shown at most once every `minutes` minutes per browser
export default function Interstitial({ ad, minutes }: { ad: AdLite | null; minutes: number }) {
  const [show, setShow] = useState(false);
  const [left, setLeft] = useState(SKIP_AFTER);

  useEffect(() => {
    if (!ad || minutes <= 0) return;
    let last = 0;
    try {
      last = parseInt(localStorage.getItem(KEY) || '0', 10);
    } catch {}
    if (Date.now() - last < minutes * 60_000) return;
    setShow(true);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
  }, [ad, minutes]);

  useEffect(() => {
    if (!show || left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [show, left]);

  if (!show || !ad) return null;

  return (
    <div className="gate interstitial" role="dialog" aria-modal="true">
      <div className="gate-box">
        <div className="row between" style={{ marginBottom: 10 }}>
          <span className="ad-label static">Sponsored</span>
          <button className="btn small ghost" disabled={left > 0} onClick={() => setShow(false)}>
            {left > 0 ? `Skip in ${left}` : 'Close ✕'}
          </button>
        </div>
        <a href={`/api/ads/${ad.id}/click`} target="_blank" rel="sponsored noopener" onClick={() => setShow(false)}>
          {ad.imageUrl && <img src={ad.imageUrl} alt="" style={{ borderRadius: 10, width: '100%' }} />}
          <h2 style={{ margin: '12px 0 4px' }}>{ad.title}</h2>
          {ad.body && <p className="muted">{ad.body}</p>}
          <span className="btn" style={{ marginTop: 8 }}>
            Learn more
          </span>
        </a>
      </div>
    </div>
  );
}
