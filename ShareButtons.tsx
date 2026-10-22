'use client';
import { useEffect, useState } from 'react';

// Share a video to WhatsApp, Facebook, X, Telegram, the phone's share menu, or copy the link.
// `url` should already carry ?ref=<sharer> so new sign-ups count as the sharer's referral.
export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const text = encodeURIComponent(`${title} – watch on Vidaake`);
  const [canNative, setCanNative] = useState(false);
  useEffect(() => setCanNative('share' in navigator), []);

  const links = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${text}%20${u}`, bg: '#25d366' },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, bg: '#1877f2' },
    { name: 'X', href: `https://x.com/intent/post?text=${text}&url=${u}`, bg: '#000' },
    { name: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${text}`, bg: '#229ed9' },
  ];

  return (
    <div className="share-row">
      <span className="muted small">Share:</span>
      {links.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="share-btn"
          style={{ background: l.bg }}
        >
          {l.name}
        </a>
      ))}
      <button
        className="share-btn"
        style={{ background: 'var(--panel-2)' }}
        onClick={async () => {
          if (canNative) {
            try {
              await navigator.share({ title, url });
              return;
            } catch {
              /* cancelled – fall through to copy */
            }
          }
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
      >
        {copied ? 'Copied ✓' : canNative ? 'More…' : 'Copy link'}
      </button>
    </div>
  );
}
