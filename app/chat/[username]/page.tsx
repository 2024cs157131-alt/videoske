import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import ChatThread from './ChatThread';

export const dynamic = 'force-dynamic';

export default async function ChatPage({ params }: { params: { username: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/chat');
  const partner = await prisma.user.findUnique({ where: { username: decodeURIComponent(params.username).toLowerCase() } });

  let problem = '';
  if (!partner || partner.banned) problem = 'User not found.';
  else if (partner.id === me.id) problem = "You can't message yourself.";
  else if (partner.managedByAdmin) problem = 'This profile does not accept messages.';

  return (
    <div className="card-panel" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="row between" style={{ marginBottom: 8 }}>
        <Link href="/chat" className="muted">
          ← Messages
        </Link>
        {partner && (
          <Link href={`/u/${partner.username}`}>
            <strong>{partner.displayName}</strong> <span className="muted">@{partner.username}</span>
          </Link>
        )}
      </div>
      {problem || !partner ? <p className="error">{problem}</p> : <ChatThread meId={me.id} partnerId={partner.id} />}
    </div>
  );
}
