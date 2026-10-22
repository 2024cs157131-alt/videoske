import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings, kesPerToken } from '@/lib/settings';
import { creatorAnalytics, dayKey, dayKeys, periods, sum } from '@/lib/analytics';
import { earningsStatus } from '@/lib/earnings';
import Compare from '@/components/Compare';
import EarningsChart from '@/components/EarningsChart';
import Avatar from '@/components/Avatar';
import { timeAgo } from '@/components/PostCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your analytics' };

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/analytics');

  const s = await getSettings();
  const kpt = kesPerToken(s);
  const ksh = (t: number) => `KSh ${Math.floor(t * kpt).toLocaleString()}`;

  const [a, earn, subscriberTotal, recentSubs, contentCount, unlockStats, topViewed] = await Promise.all([
    creatorAnalytics(user.id, 61),
    earningsStatus(user, s),
    prisma.follow.count({ where: { creatorId: user.id } }),
    prisma.follow.findMany({ where: { creatorId: user.id }, include: { follower: true }, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.video.count({ where: { ownerId: user.id, status: 'APPROVED' } }),
    prisma.unlock.groupBy({
      by: ['videoId'],
      where: { video: { ownerId: user.id } },
      _sum: { creatorShare: true },
      _count: { _all: true },
    }),
    prisma.video.findMany({
      where: { ownerId: user.id },
      orderBy: { views: 'desc' },
      take: 30,
      select: { id: true, title: true, kind: true, isPremium: true, views: true, paidViews: true, status: true },
    }),
  ]);

  const earnP = periods(a.earnings);
  const viewP = periods(a.views);
  const saleP = periods(a.sales);
  const subP = periods(a.subscribers);

  // 30-day chart
  const today = dayKey(new Date());
  const chart = dayKeys(30).map((k) => {
    const d = new Date(`${k}T12:00:00+03:00`);
    return {
      key: k,
      label: d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' }),
      amount: a.earnings.get(k) ?? 0,
      isToday: k === today,
    };
  });

  // Where the money came from (last 30 days)
  const last30 = dayKeys(30);
  const sources = [
    { label: 'Premium sales & live tickets', amount: sum(a.bySource.EARN, last30), color: 'var(--accent)' },
    { label: 'Views on free content', amount: sum(a.bySource.VIEWS, last30), color: '#2b6cdf' },
    { label: 'Referrals', amount: sum(a.bySource.REFERRAL, last30), color: 'var(--ok)' },
  ];
  const sourceTotal = Math.max(1, sources.reduce((t, x) => t + x.amount, 0));

  // Best content: earnings first, then views
  const earned = new Map(unlockStats.map((u) => [u.videoId, { tokens: u._sum.creatorShare ?? 0, sales: u._count._all }]));
  const top = [...topViewed]
    .map((v) => ({ ...v, earned: earned.get(v.id)?.tokens ?? 0, sales: earned.get(v.id)?.sales ?? 0 }))
    .sort((x, y) => y.earned - x.earned || y.views - x.views)
    .slice(0, 10);

  const free = !user.verified && user.role !== 'ADMIN';

  return (
    <div className="stack fade-in">
      <div className="row between">
        <h1 style={{ margin: 0 }}>📊 Your analytics</h1>
        <div className="row">
          <Link href="/wallet" className="btn small ghost">
            Wallet & payouts
          </Link>
          <Link href="/new" className="btn small">
            + Create
          </Link>
        </div>
      </div>

      {free && (
        <div className="upgrade-strip pop-in">
          <span>
            You’re on a free account – your views and subscribers are counted, but you don’t earn yet. Upgrade once for{' '}
            <strong>KSh {s.verification_fee_kes}</strong> to earn from premium sales and KSh {s.views_rate} per 1,000 views.
          </span>
          <Link href="/verify" className="btn small shine">
            Upgrade
          </Link>
        </div>
      )}

      {/* Headline numbers */}
      <div className="stats">
        <div className="card-panel stat stat-today">
          <span className="muted">Available balance</span>
          <strong>{ksh(earn.available)}</strong>
          <span className="muted small">
            {earn.clearing > 0 ? `${ksh(earn.clearing)} still clearing · ` : ''}
            {earn.available >= earn.min ? 'ready to withdraw' : `${ksh(Math.max(0, earn.min - earn.available))} to go`}
          </span>
        </div>
        <div className="card-panel stat">
          <span className="muted">Unpaid earnings</span>
          <strong>{ksh(earn.total)}</strong>
          <span className="muted small">
            Next payout{' '}
            {earn.nextPayoutDate.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })}
          </span>
        </div>
        <div className="card-panel stat">
          <span className="muted">Subscribers</span>
          <strong>{subscriberTotal.toLocaleString()}</strong>
          <span className="muted small">+{subP.week.cur} this week</span>
        </div>
        <div className="card-panel stat">
          <span className="muted">Published</span>
          <strong>{contentCount}</strong>
          <span className="muted small">videos & posts</span>
        </div>
      </div>

      {/* Period comparisons */}
      <div className="cmp-grid">
        {[
          { title: '💰 Earnings', p: earnP, money: true },
          { title: '👀 Unique views', p: viewP },
          { title: '🔓 Sales & tickets', p: saleP },
          { title: '🔔 New subscribers', p: subP },
        ].map((m) => (
          <div key={m.title} className="card-panel cmp-card">
            <h3>{m.title}</h3>
            <Compare label="Today" cur={m.p.day.cur} prev={m.p.day.prev} change={m.p.day.change} money={m.money} kesPerToken={kpt} />
            <Compare label="7 days" cur={m.p.week.cur} prev={m.p.week.prev} change={m.p.week.change} money={m.money} kesPerToken={kpt} />
            <Compare label="30 days" cur={m.p.month.cur} prev={m.p.month.prev} change={m.p.month.change} money={m.money} kesPerToken={kpt} />
          </div>
        ))}
      </div>
      <p className="muted small" style={{ margin: '-4px 0 0' }}>
        Each figure is compared with the period just before it: today vs yesterday, last 7 days vs the 7 before, last 30 days
        vs the 30 before.
      </p>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Daily earnings – last 30 days</h2>
        <EarningsChart days={chart} kesPerToken={kpt} />
      </section>

      <div className="two-col">
        <section className="card-panel">
          <h2 style={{ marginTop: 0 }}>Where your money comes from</h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            Last 30 days · {ksh(sources.reduce((t, x) => t + x.amount, 0))}
          </p>
          {sources.map((x) => (
            <div key={x.label} className="source-row">
              <div className="row between small">
                <span>{x.label}</span>
                <strong>{ksh(x.amount)}</strong>
              </div>
              <div className="source-bar">
                <div style={{ width: `${(x.amount / sourceTotal) * 100}%`, background: x.color }} />
              </div>
            </div>
          ))}
        </section>

        <section className="card-panel">
          <h2 style={{ marginTop: 0 }}>Newest subscribers</h2>
          {recentSubs.length === 0 && (
            <p className="muted">No subscribers yet. Share your profile on WhatsApp to get your first ones.</p>
          )}
          {recentSubs.map((f) => (
            <Link key={f.id} href={`/u/${f.follower.username}`} className="list-item" style={{ padding: '8px 0' }}>
              <span className="row" style={{ gap: 10 }}>
                <Avatar user={f.follower} size={32} />
                <span>
                  <strong>{f.follower.displayName}</strong> <span className="muted small">@{f.follower.username}</span>
                </span>
              </span>
              <span className="muted small">{timeAgo(f.createdAt)}</span>
            </Link>
          ))}
        </section>
      </div>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Your top content</h2>
        {top.length === 0 ? (
          <p className="muted">
            Nothing yet. <Link href="/new">Post something</Link> to start seeing numbers here.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Title</th>
                  <th>Views</th>
                  <th>Unique</th>
                  <th>Sales</th>
                  <th>Earned</th>
                </tr>
              </thead>
              <tbody>
                {top.map((v) => (
                  <tr key={v.id}>
                    <td>{v.kind === 'POST' ? '📝' : '🎬'}</td>
                    <td>
                      <Link href={`/v/${v.id}`}>{v.title}</Link>{' '}
                      {v.isPremium ? <span className="pill pill-lock">PREMIUM</span> : <span className="pill pill-free">FREE</span>}{' '}
                      {v.status !== 'APPROVED' && <span className="pill">{v.status === 'PENDING' ? 'In review' : 'Unpublished'}</span>}
                    </td>
                    <td>{v.views.toLocaleString()}</td>
                    <td>{v.paidViews.toLocaleString()}</td>
                    <td>{v.sales}</td>
                    <td>{v.earned > 0 ? ksh(v.earned) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">
          Earned shows premium sales. Earnings from views (KSh {s.views_rate} per 1,000 unique views on free content) are
          in the totals above.
        </p>
      </section>
    </div>
  );
}
