import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { navCounts } from '@/lib/nav';

// Slim top bar – the main tabs live in the bottom tab bar
export default async function Nav() {
  const user = await getCurrentUser();
  const { messages } = user ? await navCounts(user.id) : { messages: 0 };
  const tokens = user ? user.tokenBalance + user.bonusTokens : 0;

  return (
    <header className="nav">
      <Link href="/" className="brand">
        Vida<span>ake</span>
      </Link>
      <nav>
        {user ? (
          <>
            {!user.verified && user.role !== 'ADMIN' && (
              <Link href="/verify" className="nav-upgrade">
                Upgrade
              </Link>
            )}
            <Link href="/wallet" className="wallet-pill" title="Your tokens (1 token = KSh 1)">
              🪙 {tokens.toLocaleString()}
            </Link>
            <Link href="/analytics" className="nav-icon" title="Your analytics" aria-label="Analytics">
              📊
            </Link>
            <Link href="/chat" className="nav-icon" title="Messages" aria-label={`Messages${messages ? ` (${messages} unread)` : ''}`}>
              💬{messages > 0 && <span className="badge pulse">{messages > 99 ? '99+' : messages}</span>}
            </Link>
            {user.role === 'ADMIN' && (
              <Link href="/admin" className="nav-icon" title="Admin" aria-label="Admin">
                🛡️
              </Link>
            )}
            <form action="/api/auth/logout" method="post" className="hide-sm">
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
