'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

export default function ActionButton({
  url,
  body,
  label,
  confirmText,
  className = 'btn small',
  redirectTo,
}: {
  url: string;
  body?: unknown;
  label: string;
  confirmText?: string;
  className?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className={className}
      disabled={busy}
      onClick={async () => {
        if (confirmText && !confirm(confirmText)) return;
        setBusy(true);
        try {
          await postJSON(url, body);
          if (redirectTo) router.push(redirectTo);
          router.refresh();
        } catch (e) {
          alert((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? '…' : label}
    </button>
  );
}
