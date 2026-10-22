import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';

export default async function Nav() {
  const user = await getCurrentUser();
  const [unread, alerts] = user
    ? await Promise.all([
        prisma.message.count({ where: { receiverId: user.id, readAt: null } }),
        prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      ])
    : [0, 0];
  const tokens = user ? user.tokenBalance + user.bonusTokens : 0;

  return (
    <header className="nav">
      <Link href="/" className="brand">
        Vida<span>ake</span>
      </Link>
      <nav>
        {user ? (
          <>
            <Link href="/wallet" className="wallet-pill" title="Your tokens (1 token = KSh 1)">
              🪙 {tokens.toLocaleString()}
            </Link>
            <Link href="/new" className="nav-create">
              + Create
            </Link>
            <Link href="/live">Live</Link>
            <Link href="/notifications" className="nav-bell" title="Notifications" aria-label={`Notifications${alerts ? ` (${alerts} new)` : ''}`}>
              🔔{alerts > 0 && <span className="badge pulse">{alerts > 99 ? '99+' : alerts}</span>}
            </Link>
            <Link href="/analytics" title="Your analytics">
              📊
            </Link>
            <Link href="/chat">Chat {unread > 0 && <span className="badge pulse">{unread}</span>}</Link>
            {!user.verified && user.role !== 'ADMIN' && (
              <Link href="/verify" className="nav-upgrade">
                Upgrade
              </Link>
            )}
            {user.role === 'ADMIN' && <Link href="/admin">Admin</Link>}
            <Link href={`/u/${user.username}`} className="nav-me" title={`@${user.username}`}>
              <Avatar user={user} size={30} />
              {user.verified && <VerifiedBadge size={12} />}
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className="link muted small">Log out</button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/register" className="btn small">
              Join free (18+)
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
