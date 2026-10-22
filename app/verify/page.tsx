import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { getPricing, priceLabel } from '@/lib/pricing';
import { paystackConfigured } from '@/lib/paystack';
import VerifiedBadge from '@/components/VerifiedBadge';
import VerifyForm from './VerifyForm';

export const dynamic = 'force-dynamic';

export default async function VerifyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/verify');

  const s = await getSettings();
  const pricing = await getPricing(s);
  const fee = parseInt(s.verification_fee_kes, 10) || 200;
  const commission = parseInt(s.commission_percent, 10) || 30;

  if (user.verified) {
    return (
      <div className="card-panel narrow stack" style={{ textAlign: 'center' }}>
        <h1>
          You’re verified <VerifiedBadge size={22} />
        </h1>
        <p className="muted">
          Payouts go to:{' '}
          <strong>
            {user.payoutMethod === 'MPESA'
              ? `M-PESA ${user.payoutPhone ?? ''}`
              : `${user.payoutBank ?? 'Bank'} ••••${(user.payoutAccount ?? '').slice(-4)}`}
          </strong>{' '}
          ({user.payoutName}). To change these details, contact an admin.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link href="/upload" className="btn">
            Upload a video
          </Link>
          <Link href="/wallet" className="btn ghost">
            Earnings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-panel stack" style={{ maxWidth: 620, margin: '0 auto' }}>
      <h1>
        Become a verified creator <VerifiedBadge size={22} />
      </h1>
      <p>
        One-off fee: <strong>{priceLabel(fee, pricing)}</strong>
      </p>
      <ul className="pay-steps">
        <li>✓ Verified badge on your profile and videos</li>
        <li>Upload premium (paid) videos and run paid live streams – you earn {100 - commission}%</li>
        <li>Earn KSh {s.views_rate} for every 1,000 unique views of your free videos</li>
        <li>Withdraw your earnings to your saved payout account</li>
      </ul>
      {paystackConfigured() ? (
        <VerifyForm kenya={pricing.kenya} />
      ) : (
        <p className="error">Payments are not set up yet.</p>
      )}
    </div>
  );
}
