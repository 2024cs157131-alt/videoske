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

export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'short', timeStyle: 'short' });

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== 'ADMIN') redirect('/');

  const [settings, pending, profiles, purchases, payouts, ads, reports, users, sales, unlockSums, ticketSums, counts] =
    await Promise.all([
      getSettings(),
      prisma.video.findMany({ where: { status: 'PENDING' }, include: { owner: true }, orderBy: { createdAt: 'asc' }, take: 30 }),
      prisma.user.findMany({ where: { managedByAdmin: true }, include: { _count: { select: { videos: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.tokenPurchase.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.payout.findMany({ where: { status: 'PENDING' }, include: { user: true }, orderBy: { createdAt: 'asc' } }),
      prisma.ad.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.report.findMany({ where: { resolved: false }, include: { reporter: true, video: true }, orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({ where: { managedByAdmin: false }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.tokenPurchase.groupBy({ by: ['currency'], where: { status: 'SUCCESS' }, _sum: { amount: true, tokens: true } }),
      prisma.unlock.aggregate({ _sum: { tokens: true, creatorShare: true }, _count: true }),
      prisma.liveTicket.aggregate({ _sum: { tokens: true, creatorShare: true } }),
      Promise.all([prisma.user.count({ where: { managedByAdmin: false } }), prisma.video.count({ where: { status: 'APPROVED' } })]),
    ]);
  const [referralSum, views] = await Promise.all([
    prisma.ledgerEntry.aggregate({ where: { type: 'REFERRAL' }, _sum: { tokens: true }, _count: true }),
    prisma.video.aggregate({ _sum: { views: true } }),
  ]);

  const spent = (unlockSums._sum.tokens ?? 0) + (ticketSums._sum.tokens ?? 0);
  const creatorShare = (unlockSums._sum.creatorShare ?? 0) + (ticketSums._sum.creatorShare ?? 0);
  const platformTokens = spent - creatorShare;
  const kesPerToken = parseFloat(settings.token_price_kes) || 1;

  const referrerIds = [...new Set(users.map((u) => u.referredById).filter((x): x is string => !!x))];
  const referrers = new Map(
    (await prisma.user.findMany({ where: { id: { in: referrerIds } }, select: { id: true, username: true } })).map((r) => [r.id, `@${r.username}`]),
  );

  const pendingWithUrls = await Promise.all(
    pending.map(async (v) => ({ ...v, url: await signedVideoUrl(v.videoPath, 3600).catch(() => null) })),
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
              <strong>KES {p.amountKes.toLocaleString()}</strong> to <code>{p.phone}</code>
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
        <h2 style={{ marginTop: 0 }}>Videos waiting for approval ({pending.length})</h2>
        <p className="muted small">Approve only content with no nudity or sexual content, where everyone shown is clearly an adult.</p>
        {pending.length === 0 && <p className="muted">Nothing to review.</p>}
        {pendingWithUrls.map((v) => (
          <div key={v.id} className="list-item" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <Link href={`/v/${v.id}`}>
                <strong>{v.title}</strong>
              </Link>
              <div className="muted">
                @{v.owner.username} · {v.isPremium ? `Premium · KSh ${v.price}` : 'Free'} · {fmt(v.createdAt)}
              </div>
              {v.url && <video src={v.url} controls preload="metadata" style={{ maxHeight: 220, marginTop: 8, borderRadius: 8 }} />}
            </div>
            <div className="row">
              <ActionButton url={`/api/admin/videos/${v.id}`} body={{ status: 'APPROVED' }} label="Approve" className="btn small ok" />
              <ActionButton url={`/api/admin/videos/${v.id}`} body={{ status: 'REJECTED' }} label="Reject" className="btn small danger" />
            </div>
          </div>
        ))}
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Open reports ({reports.length})</h2>
        {reports.length === 0 && <p className="muted">No open reports.</p>}
        {reports.map((r) => (
          <div key={r.id} className="list-item">
            <div>
              <Link href={`/v/${r.videoId}`}>
                <strong>{r.video.title}</strong>
              </Link>
              <div className="muted">
                by @{r.reporter.username} · {fmt(r.createdAt)}
              </div>
              <div>{r.reason}</div>
            </div>
            <div className="row">
              <ActionButton url={`/api/admin/videos/${r.videoId}`} body={{ status: 'REJECTED' }} label="Remove video" className="btn small danger" />
              <ActionButton url={`/api/admin/reports/${r.id}`} label="Resolve" className="btn small ghost" />
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
                  <td>{u.referredById ? (referrers.get(u.referredById) ?? '–') : '–'}{u.referralRewarded ? ' ✓' : ''}</td>
                  <td>{fmt(u.createdAt)}</td>
                  <td>
                    <div className="row">
                      <CreditTokens userId={u.id} username={u.username} />
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
