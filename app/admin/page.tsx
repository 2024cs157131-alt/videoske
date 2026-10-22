import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings, money } from '@/lib/settings';
import { signedVideoUrl } from '@/lib/storage';
import { paystackConfigured } from '@/lib/paystack';
import ActionButton from '@/components/ActionButton';
import SettingsForm from './SettingsForm';
import CreateProfileForm from './CreateProfileForm';
import AdForm from './AdForm';
import CreditTokens from './CreditTokens';
import VerifiedBadge from '@/components/VerifiedBadge';
import { payoutDestination } from '@/lib/payout';
import { endStaleStreams } from '@/lib/live';
import { REPORT_CATEGORIES, type ReportCategory } from '@/lib/reports';

export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'short', timeStyle: 'short' });

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== 'ADMIN') redirect('/');

  const [settings, pending, profiles, purchases, payouts, ads, reports, users, sales, unlockSums, ticketSums, counts] =
    await Promise.all([
      getSettings(),
      // Flagged queue: videos with open reports, plus hidden videos waiting for a decision
      prisma.video.findMany({
        where: { OR: [{ status: 'PENDING' }, { reports: { some: { resolved: false } } }] },
        include: { owner: true, reports: { where: { resolved: false }, include: { reporter: true }, orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.user.findMany({ where: { managedByAdmin: true }, include: { _count: { select: { videos: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.tokenPurchase.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.payout.findMany({ where: { status: 'PENDING' }, include: { user: true }, orderBy: { createdAt: 'asc' } }),
      prisma.ad.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.report.findMany({ where: { resolved: false }, include: { reporter: true, video: true }, orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({ where: { managedByAdmin: false }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.tokenPurchase.groupBy({ by: ['currency'], where: { status: 'SUCCESS', purpose: 'TOKENS' }, _sum: { amount: true, tokens: true } }),
      prisma.unlock.aggregate({ _sum: { tokens: true, creatorShare: true }, _count: true }),
      prisma.liveTicket.aggregate({ _sum: { tokens: true, creatorShare: true } }),
      Promise.all([prisma.user.count({ where: { managedByAdmin: false } }), prisma.video.count({ where: { status: 'APPROVED' } })]),
    ]);
  await endStaleStreams();
  const [verifySales, verifiedCount, viewsPaid] = await Promise.all([
    prisma.tokenPurchase.groupBy({ by: ['currency'], where: { status: 'SUCCESS', purpose: 'VERIFICATION' }, _sum: { amount: true }, _count: true }),
    prisma.user.count({ where: { verified: true } }),
    prisma.ledgerEntry.aggregate({ where: { type: 'VIEWS' }, _sum: { tokens: true } }),
  ]);
  const [referralSum, views, liveNow] = await Promise.all([
    prisma.ledgerEntry.aggregate({ where: { type: 'REFERRAL' }, _sum: { tokens: true }, _count: true }),
    prisma.video.aggregate({ _sum: { views: true } }),
    prisma.liveStream.findMany({ where: { isLive: true }, include: { host: true }, orderBy: { startedAt: 'asc' } }),
  ]);
  const pendingLive = liveNow.filter((s) => s.status === 'PENDING');
  const approvedLive = liveNow.filter((s) => s.status === 'APPROVED');

  const spent = (unlockSums._sum.tokens ?? 0) + (ticketSums._sum.tokens ?? 0);
  const creatorShare = (unlockSums._sum.creatorShare ?? 0) + (ticketSums._sum.creatorShare ?? 0);
  const platformTokens = spent - creatorShare;
  const kesPerToken = parseFloat(settings.token_price_kes) || 1;

  const referrerIds = [...new Set(users.map((u) => u.referredById).filter((x): x is string => !!x))];
  const referrers = new Map(
    (await prisma.user.findMany({ where: { id: { in: referrerIds } }, select: { id: true, username: true } })).map((r) => [r.id, `@${r.username}`]),
  );

  // Most urgent first: possible minors, then sexual-content reports, then by number of reports
  const urgency = (v: (typeof pending)[number]) =>
    (v.reports.some((r) => r.category === 'UNDERAGE') ? 1000 : 0) +
    (v.reports.some((r) => r.category === 'SEXUAL') ? 100 : 0) +
    v.reports.length;
  const flagged = await Promise.all(
    [...pending]
      .sort((a, b) => urgency(b) - urgency(a))
      .map(async (v) => ({ ...v, url: await signedVideoUrl(v.videoPath, 3600).catch(() => null) })),
  );

  return (
    <div className="stack">
      <h1>Admin dashboard</h1>
      {!paystackConfigured() && (
        <div className="error">PAYSTACK_SECRET_KEY is not set in Vercel – token purchases are switched off.</div>
      )}

      <div className="stats">
        {sales.length === 0 && (
          <div className="card-panel stat">
            <span className="muted">Token sales</span>
            <strong>KES 0</strong>
          </div>
        )}
        {sales.map((s) => (
          <div key={s.currency} className="card-panel stat">
            <span className="muted">Token sales ({s.currency})</span>
            <strong>{money(s._sum.amount ?? 0, s.currency)}</strong>
            <span className="muted small">{(s._sum.tokens ?? 0).toLocaleString()} tokens</span>
          </div>
        ))}
        <div className="card-panel stat">
          <span className="muted">Verification fees</span>
          <strong>{verifySales.length ? verifySales.map((v) => money(v._sum.amount ?? 0, v.currency)).join(' + ') : 'KSh 0'}</strong>
          <span className="muted small">{verifiedCount} verified creators</span>
        </div>
        <div className="card-panel stat">
          <span className="muted">Paid for views</span>
          <strong>KSh {((viewsPaid._sum.tokens ?? 0) * kesPerToken).toLocaleString()}</strong>
          <span className="muted small">KSh {settings.views_rate} per 1,000 unique views</span>
        </div>
        <div className="card-panel stat">
          <span className="muted">Your commission ({settings.commission_percent}%)</span>
          <strong>🪙 {platformTokens.toLocaleString()}</strong>
          <span className="muted small">≈ KES {Math.floor(platformTokens * kesPerToken).toLocaleString()}</span>
        </div>
        <div className="card-panel stat">
          <span className="muted">Owed to creators</span>
          <strong>🪙 {creatorShare.toLocaleString()}</strong>
          <span className="muted small">{payouts.length} payout request(s)</span>
        </div>
        <div className="card-panel stat">
          <span className="muted">Referral rewards paid</span>
          <strong>KSh {((referralSum._sum.tokens ?? 0) * kesPerToken).toLocaleString()}</strong>
          <span className="muted small">{referralSum._count} active referrals</span>
        </div>
        <div className="card-panel stat">
          <span className="muted">Total video views</span>
          <strong>{(views._sum.views ?? 0).toLocaleString()}</strong>
        </div>
        <div className="card-panel stat">
          <span className="muted">Members / live videos</span>
          <strong>
            {counts[0]} / {counts[1]}
          </strong>
        </div>
      </div>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Payout requests ({payouts.length})</h2>
        <p className="muted small">Send the KES amount to the M-PESA number, then click “Mark paid”. “Reject” returns the tokens to the creator.</p>
        {payouts.length === 0 && <p className="muted">No pending payouts.</p>}
        {payouts.map((p) => (
          <div key={p.id} className="list-item">
            <div>
              <strong>KSh {p.amountKes.toLocaleString()}</strong> to {p.method === 'BANK' ? 'bank' : 'M-PESA'} <code>{p.phone}</code>
              {p.user.payoutName ? ` (${p.user.payoutName})` : ''}
              <div className="muted">
                @{p.user.username} · {p.tokens} tokens · {fmt(p.createdAt)}
              </div>
            </div>
            <div className="row">
              <ActionButton url={`/api/admin/payouts/${p.id}`} body={{ status: 'PAID' }} label="Mark paid" className="btn small ok" confirmText={`Have you sent KES ${p.amountKes} to ${p.phone}?`} />
              <ActionButton url={`/api/admin/payouts/${p.id}`} body={{ status: 'REJECTED' }} label="Reject" className="btn small danger" confirmText="Reject and return the tokens to the creator?" />
            </div>
          </div>
        ))}
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>
          <span className="live-dot" />
          Live streams waiting for approval ({pendingLive.length})
        </h2>
        <p className="muted small">Open the stream to watch it first. Viewers can join only after you approve.</p>
        {pendingLive.length === 0 && <p className="muted">No streams waiting.</p>}
        {pendingLive.map((s) => (
          <div key={s.id} className="list-item">
            <div>
              <strong>{s.title}</strong>
              <div className="muted">
                @{s.host.username} · {s.ticketPrice > 0 ? `ticket KSh ${s.ticketPrice}` : 'free'} · started {fmt(s.startedAt)}
              </div>
            </div>
            <div className="row">
              <Link href={`/live/${s.id}`} className="btn small ghost">
                Watch
              </Link>
              <ActionButton url={`/api/admin/live/${s.id}`} body={{ action: 'APPROVE' }} label="Approve" className="btn small ok" />
              <ActionButton url={`/api/admin/live/${s.id}`} body={{ action: 'FLAG' }} label="🚩 Sexual – end" className="btn small danger" confirmText="Flag as sexual content and end this stream?" />
              <ActionButton url={`/api/admin/live/${s.id}`} body={{ action: 'REJECT' }} label="Reject" className="btn small ghost" confirmText="Reject and end this stream?" />
            </div>
          </div>
        ))}
        {approvedLive.length > 0 && (
          <>
            <h3 style={{ marginBottom: 6 }}>Live now ({approvedLive.length})</h3>
            {approvedLive.map((s) => (
              <div key={s.id} className="list-item">
                <div>
                  <strong>{s.title}</strong>
                  <div className="muted">@{s.host.username} · started {fmt(s.startedAt)}</div>
                </div>
                <div className="row">
                  <Link href={`/live/${s.id}`} className="btn small ghost">
                    Watch
                  </Link>
                  <ActionButton url={`/api/admin/live/${s.id}`} body={{ action: 'FLAG' }} label="🚩 Sexual – end" className="btn small danger" confirmText="Flag as sexual content and end this stream?" />
                </div>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>🚩 Flagged content ({flagged.length})</h2>
        <p className="muted small">
          Videos publish straight away. Ones that users report show up here. Videos reported {settings.auto_hide_reports}+
          times, or reported as showing someone under 18, are hidden automatically until you decide. Delete anything
          sexual or illegal. Add a warning for mature content that’s allowed. Dismiss reports that are wrong.
        </p>
        {flagged.length === 0 && <p className="muted">Nothing flagged. 🎉</p>}
        {flagged.map((v) => (
          <div key={v.id} className="list-item" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px' }}>
              <Link href={`/v/${v.id}`}>
                <strong>{v.title}</strong>
              </Link>{' '}
              {v.status === 'PENDING' && <span className="badge" style={{ background: 'var(--warn)', color: '#000' }}>hidden</span>}{' '}
              {v.sensitive && <span className="badge" style={{ background: '#555' }}>⚠ warning</span>}
              <div className="muted">
                @{v.owner.username} · {v.isPremium ? `Premium · KSh ${v.price}` : 'Free'} · {fmt(v.createdAt)} · {v.reports.length} report
                {v.reports.length === 1 ? '' : 's'}
              </div>
              {v.reports.slice(0, 5).map((r) => (
                <div key={r.id} className="small" style={{ marginTop: 4 }}>
                  <strong>{REPORT_CATEGORIES[r.category as ReportCategory] ?? r.category}</strong> – @{r.reporter.username}
                  {r.reason && r.reason !== REPORT_CATEGORIES[r.category as ReportCategory] ? `: “${r.reason}”` : ''}
                </div>
              ))}
              {v.url && <video src={v.url} controls preload="metadata" style={{ maxHeight: 220, marginTop: 8, borderRadius: 8 }} />}
            </div>
            <div className="row">
              <ActionButton
                url={`/api/admin/videos/${v.id}`}
                body={{ action: 'DELETE' }}
                label="🗑 Delete"
                className="btn small danger"
                confirmText="Delete this video and its files for good?"
              />
              <ActionButton url={`/api/admin/videos/${v.id}`} body={{ action: 'WARN' }} label="⚠ Keep with warning" className="btn small" />
              <ActionButton url={`/api/admin/videos/${v.id}`} body={{ action: 'DISMISS' }} label="Dismiss" className="btn small ghost" />
            </div>
          </div>
        ))}
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Ads</h2>
        <AdForm />
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Ad</th>
                <th>Type</th>
                <th>Views</th>
                <th>Clicks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ads.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title}</strong>
                    <div className="muted small">{a.linkUrl}</div>
                  </td>
                  <td>{a.type === 'NATIVE' ? 'Native (feed)' : 'Interstitial'}</td>
                  <td>{a.impressions}</td>
                  <td>{a.clicks}</td>
                  <td>
                    <div className="row">
                      <ActionButton url={`/api/admin/ads/${a.id}`} body={{ active: !a.active }} label={a.active ? 'Pause' : 'Activate'} className={`btn small ${a.active ? 'ghost' : 'ok'}`} />
                      <ActionButton url={`/api/admin/ads/${a.id}`} body={{ delete: true }} label="Delete" className="btn small danger" confirmText="Delete this ad?" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ads.length === 0 && <p className="muted">No ads yet.</p>}
        </div>
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Settings</h2>
        <SettingsForm initial={settings} />
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Creator profiles (run by admin)</h2>
        <p className="muted small">Earnings from these profiles go 100% to the platform.</p>
        <CreateProfileForm />
        <div style={{ marginTop: 16 }}>
          {profiles.map((p) => (
            <div key={p.id} className="list-item">
              <div>
                <Link href={`/u/${p.username}`}>
                  <strong>{p.displayName}</strong> <span className="muted">@{p.username}</span>
                </Link>
                <div className="muted">{p._count.videos} videos</div>
              </div>
              <Link href={`/upload?owner=${p.id}`} className="btn small">
                + Add video
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Recent token purchases</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Tokens</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>{fmt(p.createdAt)}</td>
                  <td>@{p.user.username}</td>
                  <td>{p.tokens}</td>
                  <td>{money(p.amount, p.currency)}</td>
                  <td>{p.channel ?? '–'}</td>
                  <td>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Members (latest 50)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Tokens</th>
                <th>Earned</th>
                <th>Verified / payout to</th>
                <th>Referred by</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link href={`/u/${u.username}`}>@{u.username}</Link> {u.role === 'ADMIN' && <span className="badge">admin</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.tokenBalance}</td>
                  <td>{u.earnedTokens}</td>
                  <td className="small">
                    {u.verified ? (
                      <>
                        <VerifiedBadge /> {payoutDestination(u) ?? 'no payout details'}
                        {u.payoutMethod === 'BANK' && (
                          <div className="muted">
                            {u.payoutAccount} {u.payoutSwift} {u.payoutCountry}
                          </div>
                        )}
                      </>
                    ) : (
                      '–'
                    )}
                  </td>
                  <td>{u.referredById ? (referrers.get(u.referredById) ?? '–') : '–'}{u.referralRewarded ? ' ✓' : ''}</td>
                  <td>{fmt(u.createdAt)}</td>
                  <td>
                    <div className="row">
                      <CreditTokens userId={u.id} username={u.username} />
                      <ActionButton
                        url={`/api/admin/users/${u.id}`}
                        body={{ verified: !u.verified }}
                        label={u.verified ? 'Unverify' : 'Verify'}
                        className="btn small ghost"
                        confirmText={u.verified ? `Remove @${u.username}'s verified badge?` : `Verify @${u.username} without payment?`}
                      />
                      {u.id !== me.id && (
                        <ActionButton
                          url={`/api/admin/users/${u.id}`}
                          body={{ banned: !u.banned }}
                          label={u.banned ? 'Unban' : 'Ban'}
                          className={`btn small ${u.banned ? 'ghost' : 'danger'}`}
                          confirmText={u.banned ? undefined : `Ban @${u.username}?`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
