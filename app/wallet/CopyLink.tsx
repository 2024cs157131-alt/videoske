'use client';
import { useState } from 'react';

export default function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const text = encodeURIComponent(`Join me on VideosKE: ${link}`);
  return (
    <div className="row">
      <input value={link} readOnly onFocus={(e) => e.currentTarget.select()} style={{ flex: '1 1 260px' }} />
      <button
        className="btn small"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
      >
        {copied ? 'Copied ✓' : 'Copy link'}
      </button>
      <a className="btn small ghost" href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener">
        Share on WhatsApp
      </a>
    </div>
  );
}
