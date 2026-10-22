'use client';
import { useState } from 'react';
import { postJSON } from '@/lib/client';

export default function SubscribeButton({
  creatorId,
  initialSubscribed,
  initialCount,
  loggedIn,
  small,
}: {
  creatorId: string;
  initialSubscribed: boolean;
  initialCount: number;
  loggedIn: boolean;
  small?: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [bump, setBump] = useState(false);

  return (
    <button
      className={`btn ${small ? 'small' : ''} ${subscribed ? 'ghost' : 'subscribe'} ${bump ? 'bump' : ''}`}
      disabled={busy}
      onAnimationEnd={() => setBump(false)}
      onClick={async () => {
        if (!loggedIn) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }
        const next = !subscribed;
        setBusy(true);
        setSubscribed(next); // optimistic
        setCount((c) => c + (next ? 1 : -1));
        try {
          const r = await postJSON<{ subscribers: number }>('/api/follow', { creatorId, subscribe: next });
          setCount(r.subscribers);
          if (next) setBump(true);
        } catch (e) {
          setSubscribed(!next);
          setCount((c) => c + (next ? -1 : 1));
          alert((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {subscribed ? '✓ Subscribed' : '🔔 Subscribe'} · {count.toLocaleString()}
    </button>
  );
}
