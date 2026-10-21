'use client';
import { useRouter } from 'next/navigation';
import { postJSON } from '@/lib/client';

export default function CreditTokens({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  return (
    <button
      className="btn small ghost"
      onClick={async () => {
        const t = prompt(`How many tokens to add to @${username}'s wallet?`);
        if (!t) return;
        const note = prompt('Reason (shown in their history):', 'Added by admin') ?? undefined;
        try {
          await postJSON(`/api/admin/users/${userId}/tokens`, { tokens: parseInt(t, 10), note });
          router.refresh();
        } catch (e) {
          alert((e as Error).message);
        }
      }}
    >
      + Tokens
    </button>
  );
}
