import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function Nav() {
  const user = await getCurrentUser();
  const unread = user ? await prisma.message.count({ where: { receiverId: user.id, readAt: null } }) : 0;

  return (
    <header className="nav">
      <Link href="/" className="brand">
        Vida<span>ake</span>
      </Link>
      <nav>
        {user ? (
          <>
            <Link href="/wallet" className="wallet-pill" title="Your tokens">
              🪙 {user.tokenBalance}
            </Link>
            <Link href="/upload">Upload</Link>
            <Link href="/live">Live</Link>
            <Link href="/chat">Chat {unread > 0 && <span className="badge">{unread}</span>}</Link>
            <Link href={`/u/${user.username}`}>@{user.username}</Link>
            {user.role === 'ADMIN' && <Link href="/admin">Admin</Link>}
            <form action="/api/auth/logout" method="post">
              <button className="link">Log out</button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login">Log in</Link>
            <Link href="/register" className="btn small">
              Join (18+)
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
