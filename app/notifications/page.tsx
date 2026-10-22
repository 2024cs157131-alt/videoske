import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import { timeAgo } from '@/components/PostCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifications' };

const ICON: Record<string, string> = { UPLOAD: '🎬', POST: '📝', LIVE: '🔴', SUBSCRIBER: '🔔' };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/notifications');

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  // Opening the page marks everything as read
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });

  return (
    <div className="card-panel fade-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1>Notifications</h1>
      {items.length === 0 && (
        <p className="muted">
          Nothing yet. Subscribe to creators you like – you’ll be told here when they upload or go live.
        </p>
      )}
      {items.map((n, i) => (
        <Link
          key={n.id}
          href={n.link}
          className={`notif ${n.readAt ? '' : 'unread'} feed-item`}
          style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}
        >
          {n.actor ? <Avatar user={n.actor} size={40} /> : <span className="notif-icon">{ICON[n.type] ?? '🔔'}</span>}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div>
              {ICON[n.type] ?? '🔔'} {n.text}
            </div>
            <div className="muted small">{timeAgo(n.createdAt)} ago</div>
          </div>
          {!n.readAt && <span className="notif-dot" />}
        </Link>
      ))}
    </div>
  );
}
