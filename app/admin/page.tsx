import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { signedVideoUrl } from '@/lib/storage';
import ActionButton from '@/components/ActionButton';
import SettingsForm from './SettingsForm';
import CreateProfileForm from './CreateProfileForm';

export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'short', timeStyle: 'short' });

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me || me.role !== 'ADMIN') redirect('/');

  const [settings, pending, profiles, purchases, attempts, reports, users, totals, counts] = await Promise.all([
    getSettings(),
    prisma.video.findMany({ where: { status: 'PENDING' }, include: { owner: true }, orderBy: { createdAt: 'asc' }, take: 30 }),
    prisma.user.findMany({ where: { managedByAdmin: true }, include: { _count: { select: { videos: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.purchase.findMany({ include: { user: true, video: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.paymentAttempt.findMany({ include: { user: true, video: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.report.findMany({ where: { resolved: false }, include: { reporter: true, video: true }, orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({ where: { managedByAdmin: false }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.purchase.aggregate({ _sum: { amount: true }, _count: true }),
    Promise.all([prisma.user.count({ where: { managedByAdmin: false } }), prisma.video.count({ where: { status: 'APPROVED' } })]),
  ]);

  const pendingWithUrls = await Promise.all(
    pending.map(async (v) => ({ ...v, url: await signedVideoUrl(v.videoPath, 3600).catch(() => null) })),
  );

  return (
    <div className="stack">
      <h1>Admin dashboard</h1>

      <div className="stats">
        <div className="card-panel stat">
          <span className="muted">Revenue (verified)</span>
          <strong>Ksh {(totals._sum.amount ?? 0).toLocaleString()}</strong>
        </div>
        <div className="card-panel stat">
          <span className="muted">Unlocks</span>
          <strong>{totals._count}</strong>
        </div>
        <div className="card-panel stat">
          <span className="muted">Members</span>
          <strong>{counts[0]}</strong>
        </div>
        <div className="card-panel stat">
          <span className="muted">Live videos</span>
          <strong>{counts[1]}</strong>
        </div>
      </div>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Payment settings</h2>
        <SettingsForm initial={settings} />
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Videos waiting for approval ({pending.length})</h2>
        {pending.length === 0 && <p className="muted">Nothing to review.</p>}
        {pendingWithUrls.map((v) => (
          <div key={v.id} className="list-item" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              <Link href={`/v/${v.id}`}>
                <strong>{v.title}</strong>
              </Link>
              <div className="muted">
                @{v.owner.username} · Ksh {v.price} · {fmt(v.createdAt)}
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
        <h2 style={{ marginTop: 0 }}>Creator profiles</h2>
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
        <h2 style={{ marginTop: 0 }}>Recent verified payments</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Amount</th>
                <th>Paid on</th>
                <th>User</th>
                <th>Video</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.mpesaCode}</code>
                  </td>
                  <td>Ksh {p.amount}</td>
                  <td>{fmt(p.mpesaDate)}</td>
                  <td>@{p.user.username}</td>
                  <td>
                    <Link href={`/v/${p.videoId}`}>{p.video.title}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Failed unlock attempts</h2>
        <p className="muted small">Repeated failures from one user can mean fake or edited M-PESA messages.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Video</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>{fmt(a.createdAt)}</td>
                  <td>@{a.user.username}</td>
                  <td>{a.video.title}</td>
                  <td title={a.rawMessage}>{a.reason}</td>
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
                <th>Joined</th>
                <th>Consent</th>
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
                  <td>{fmt(u.createdAt)}</td>
                  <td>{fmt(u.consentAt)}</td>
                  <td>
                    {u.id !== me.id && (
                      <ActionButton
                        url={`/api/admin/users/${u.id}`}
                        body={{ banned: !u.banned }}
                        label={u.banned ? 'Unban' : 'Ban'}
                        className={`btn small ${u.banned ? 'ghost' : 'danger'}`}
                        confirmText={u.banned ? undefined : `Ban @${u.username}?`}
                      />
                    )}
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
