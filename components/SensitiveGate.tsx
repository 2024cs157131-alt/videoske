'use client';
import { useState } from 'react';

// X-style content warning: blurs the player until the viewer chooses to see it
export default function SensitiveGate({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  if (shown) return <>{children}</>;
  return (
    <div className="sensitive-wrap">
      <div className="sensitive-blur" aria-hidden>
        {children}
      </div>
      <div className="sensitive-overlay">
        <div>
          <div style={{ fontSize: 28 }}>⚠</div>
          <strong>Sensitive content</strong>
          <p className="muted small" style={{ margin: '6px 0 12px' }}>
            This video may contain mature content such as strong language or violence.
          </p>
          <button className="btn small" onClick={() => setShown(true)}>
            Show
          </button>
        </div>
      </div>
    </div>
  );
}
