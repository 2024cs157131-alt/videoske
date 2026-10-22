import { redirect } from 'next/navigation';
import { siteOrigin } from '@/lib/site';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSettings, kesPerToken, money, packagePrice, tokenPackages } from '@/lib/settings';
import { getPricing, priceLabel } from '@/lib/pricing';
import { paystackConfigured } from '@/lib/paystack';
import BuyTokens from './BuyTokens';
import PayoutForm from './PayoutForm';
import CopyLink from './CopyLink';
import { payoutDestination } from '@/lib/payout';
import { dailyEarnings, earningsStatus } from '@/lib/earnings';
import EarningsChart from '@/components/EarningsChart';
import VerifiedBadge from '@/components/VerifiedBadge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const fmt = (d: Date) => d.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' });

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/wallet');

  const s = await getSettings();
  const pricing = await getPricing(s);
  const [ledger, payouts, purchases, referred, activeReferred, referralEarned] = await Promise.all([
    prisma.ledgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 40 }),
    prisma.payout.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.tokenPurchase.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.user.count({ where: { referredById: user.id } }),
    prisma.user.count({ where: { referredById: user.id, referralRewarded: true } }),
    prisma.ledgerEntry.aggregate({ where: { userId: user.id, type: 'REFERRAL' }, _sum: { tokens: true } }),
  ]);

  // What this visitor will be charged: Kenya = KES (M-PESA/card); elsewhere = USD card if enabled, else KES card
  const chargeCurrency = !pricing.kenya && s.usd_enabled === 'true' ? 'USD' : 'KES';
  const packages = tokenPackages(s).map((tokens) => ({
    tokens,
    shown: priceLabel(tokens, pricing),
    charged: chargeCurrency === 'KES' && !pricing.kenya ? money(packagePrice(s, tokens, 'KES'), 'KES') : null,
  }));

  const kpt = kesPerToken(s);
  const commission = parseInt(s.commission_percent, 10);
  const reward = parseInt(s.referral_reward, 10) || 0;
  const origin = siteOrigin();
  const [earn, daily] = await Promise.all([earningsStatus(user, s), dailyEarnings(user.id, 14)]);
  const today = daily[daily.length - 1]?.amount ?? 0;
  const week = daily.slice(-7).reduce((n, d) => n + d.amount, 0);
  const refLink = `${origin}/register?ref=${user.username}`;

  return (
    <div className="stack">
      <div className="stats">
        <div className="card-panel stat">
          <span className="muted">Tokens to spend</span>
          <strong>🪙 {(user.tokenBalance + user.bonusTokens).toLocaleString()}</strong>
          <span className="muted small">
            {user.bonusTokens > 0
              ? `${user.tokenBalance.toLocaleString()} bought + ${user.bonusTokens.toLocaleString()} free bonus (viewing only)`
              : `≈ ${priceLabel(user.tokenBalance, pricing)}`}
          </span>
        </div>
        <div className="card-panel stat stat-today">
          <span className="muted">Earned today</span>
          <strong className="count-up">KSh {Math.floor(today * kpt).toLocaleString()}</strong>
          <span className="muted small">KSh {Math.floor(week * kpt).toLocaleString()} in the last 7 days</span>
        </div>
        <div className="card-panel stat">
          <span className="muted">Available to withdraw</span>
          <strong>KSh {Math.floor(earn.available * kpt).toLocaleString()}</strong>
          <span className="muted small">
            of KSh {Math.floor(earn.total * kpt).toLocaleString()} earned
            {earn.clearing > 0 ? ` · KSh ${Math.floor(earn.clearing * kpt).toLocaleString()} clearing` : ''}
          </span>
        </div>
        <div className="card-panel stat">
          <span className="muted">Next payout day</span>
          <strong>{earn.nextPayoutDate.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })}</strong>
          <span className="muted small">Paid weekly every {earn.payoutDay}</span>
        </div>
      </div>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Buy tokens</h2>
        <p className="muted">
          1 token = KSh {kpt}
          {!pricing.kenya && ` (about $${(kpt / pricing.usdRate).toFixed(4)})`}.{' '}
          {pricing.kenya
            ? 'Pay with M-PESA or card.'
            : chargeCurrency === 'USD'
              ? 'Pay by card in US dollars.'
              : 'Pay by card – you’ll be charged in Kenyan shillings (your bank converts it).'}{' '}
          Payments are processed securely by Paystack.
        </p>
        {paystackConfigured() ? <BuyTokens packages={packages} /> : <p className="error">Payments are not set up yet.</p>}
        {purchases.some((p) => p.status === 'PENDING') && (
          <p className="muted small">Paid but tokens not showing yet? M-PESA can take a minute – refresh this page shortly.</p>
        )}
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Invite friends – earn KSh {reward}</h2>
        <p className="muted">
          Share your link. When someone joins with it and buys at least {s.referral_min_purchase} tokens, you earn{' '}
          {reward} tokens (KSh {reward * kpt}) in withdrawable earnings – for every active member you bring.
        </p>
        <CopyLink link={refLink} />
        <div className="stats" style={{ marginTop: 12 }}>
          <div className="stat">
            <span className="muted">Joined with your link</span>
            <strong>{referred}</strong>
          </div>
          <div className="stat">
            <span className="muted">Active (rewarded)</span>
            <strong>{activeReferred}</strong>
          </div>
          <div className="stat">
            <span className="muted">Referral earnings</span>
            <strong>KSh {((referralEarned._sum.tokens ?? 0) * kpt).toLocaleString()}</strong>
          </div>
        </div>
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Daily earnings</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Premium sales, paid views and referral rewards, per day (last 14 days).
        </p>
        <EarningsChart days={daily} kesPerToken={kpt} />
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>Weekly payouts</h2>
        <p className="muted">
          {user.verified ? (
            <>
              <VerifiedBadge /> Verified creator.{' '}
            </>
          ) : (
            <>
              <Link href="/verify" style={{ textDecoration: 'underline' }}>
                Verified creators
              </Link>{' '}
              (one-off KSh {s.verification_fee_kes}){' '}
            </>
          )}
          earn {100 - commission}% of the tokens people spend on their premium videos and paid live streams, plus KSh{' '}
          {s.views_rate} per 1,000 unique views of their free videos. Everyone earns referral rewards.
        </p>
        <ul className="pay-steps muted">
          <li>Earnings build up and become available {s.payout_hold_days} days after they’re earned.</li>
          <li>
            Once you have at least <strong>KSh {(earn.min * kpt).toLocaleString()}</strong> available, request a payout –
            one request per week.
          </li>
          <li>
            Payouts are sent every <strong>{earn.payoutDay}</strong>, only to the payout details saved at verification.
          </li>
        </ul>
        <PayoutForm
          available={earn.available}
          min={earn.min}
          kesPerToken={kpt}
          verified={user.verified}
          destination={payoutDestination(user)}
          nextRequest={earn.nextRequestAt ? earn.nextRequestAt.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' }) : null}
          payoutDay={earn.payoutDay}
        />
        {payouts.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>Tokens</th>
                  <th>KSh</th>
                  <th>To</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td>{fmt(p.createdAt)}</td>
                    <td>{p.tokens}</td>
                    <td>{p.amountKes.toLocaleString()}</td>
                    <td>{p.phone}</td>
                    <td>
                      {p.status}
                      {p.note ? ` – ${p.note}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card-panel">
        <h2 style={{ marginTop: 0 }}>History</h2>
        {ledger.length === 0 && <p className="muted">No activity yet.</p>}
        <div className="table-wrap">
          <table>
            <tbody>
              {ledger.map((l) => (
                <tr key={l.id}>
                  <td className="muted">{fmt(l.createdAt)}</td>
                  <td>{l.note ?? l.type}</td>
                  <td className={l.tokens >= 0 ? 'plus' : 'minus'} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {l.tokens >= 0 ? '+' : ''}
                    {l.tokens} {['EARN', 'PAYOUT', 'PAYOUT_REFUND', 'REFERRAL', 'VIEWS'].includes(l.type) ? '(earnings)' : ''}
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
