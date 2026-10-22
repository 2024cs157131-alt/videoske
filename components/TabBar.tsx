'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Me = { username: string; displayName: string; avatarUrl: string | null } | null;

// App-style tab bar fixed to the bottom of the screen
export default function TabBar({ me, alerts }: { me: Me; alerts: number }) {
  const path = usePathname();
  const active = (href: string, exact = false) => (exact ? path === href : path === href || path.startsWith(href + '/'));

  const Tab = ({ href, icon, label, on, badge }: { href: string; icon: React.ReactNode; label: string; on: boolean; badge?: number }) => (
    <Link href={href} className={`tab ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined}>
      <span className="tab-icon">
        {icon}
        {!!badge && <span className="tab-badge">{badge > 99 ? '99+' : badge}</span>}
      </span>
      <span className="tab-label">{label}</span>
    </Link>
  );

  return (
    <nav className="tabbar" aria-label="Main">
      <Tab href="/" icon="🏠" label="Home" on={active('/', true)} />
      <Tab href="/live" icon="🔴" label="Live" on={active('/live')} />
      {me ? (
        <>
          <Link href="/new" className={`tab tab-create ${active('/new') || active('/upload') ? 'on' : ''}`} aria-label="Create">
            <span className="create-btn">＋</span>
          </Link>
          <Tab href="/notifications" icon="🔔" label="Alerts" on={active('/notifications')} badge={alerts} />
          <Tab
            href={`/u/${me.username}`}
            icon={
              me.avatarUrl ? (
                <img src={me.avatarUrl} alt="" className="tab-avatar" />
              ) : (
                <span className="tab-avatar tab-initial">{(me.displayName || me.username)[0]?.toUpperCase()}</span>
              )
            }
            label="Me"
            on={active(`/u/${me.username}`) || active('/settings') || active('/analytics') || active('/wallet')}
          />
        </>
      ) : (
        <>
          <Link href="/register" className="tab tab-create" aria-label="Join">
            <span className="create-btn">＋</span>
          </Link>
          <Tab href="/login" icon="👤" label="Log in" on={active('/login')} />
          <Tab href="/register" icon="✨" label="Join" on={active('/register')} />
        </>
      )}
    </nav>
  );
}
