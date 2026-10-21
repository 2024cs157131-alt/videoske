import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Message, User } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ChatIndex({ searchParams }: { searchParams: { to?: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect('/login?next=/chat');
  if (searchParams.to) redirect(`/chat/${encodeURIComponent(searchParams.to.replace(/^@/, '').toLowerCase())}`);

  const msgs = await prisma.message.findMany({
    where: { OR: [{ senderId: me.id }, { receiverId: me.id }] },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { sender: true, receiver: true },
  });

  const convos = new Map<string, { partner: User; last: Message; unread: number }>();
  for (const m of msgs) {
    const partner = m.senderId === me.id ? m.receiver : m.sender;
    if (!convos.has(partner.id)) convos.set(partner.id, { partner, last: m, unread: 0 });
    if (m.receiverId === me.id && !m.readAt) convos.get(partner.id)!.unread++;
  }

  return (
    <div className="card-panel" style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1>Messages</h1>
      <form method="get" className="row" style={{ marginBottom: 12 }}>
        <input name="to" placeholder="Start a chat: enter a username" style={{ flex: 1 }} required />
        <button className="btn small">Open</button>
      </form>
      {convos.size === 0 && <p className="muted">No conversations yet.</p>}
      {[...convos.values()].map(({ partner, last, unread }) => (
        <Link key={partner.id} href={`/chat/${partner.username}`} className="list-item">
          <div style={{ minWidth: 0 }}>
            <strong>{partner.displayName}</strong> <span className="muted">@{partner.username}</span>
            <div className="muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {last.senderId === me.id ? 'You: ' : ''}
              {last.body}
            </div>
          </div>
          {unread > 0 && <span className="badge">{unread}</span>}
        </Link>
      ))}
    </div>
  );
}
