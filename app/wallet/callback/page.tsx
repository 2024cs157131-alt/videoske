import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { paystack, type PaystackTxn } from '@/lib/paystack';
import { settlePurchase } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

// Paystack sends the buyer back here after paying: /wallet/callback?reference=...
export default async function PaymentCallback({ searchParams }: { searchParams: { reference?: string; trxref?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/wallet');
  const reference = searchParams.reference || searchParams.trxref || '';

  let purchase = reference ? await prisma.tokenPurchase.findUnique({ where: { reference } }) : null;
  if (!purchase || purchase.userId !== user.id) {
    return (
      <div className="card-panel narrow">
        <h1>Payment not found</h1>
        <Link href="/wallet" className="btn">
          Back to wallet
        </Link>
      </div>
    );
  }

  // Double-check with Paystack (the webhook also does this; whichever arrives first credits the tokens)
  if (purchase.status === 'PENDING') {
    try {
      const txn = await paystack<PaystackTxn>(`/transaction/verify/${encodeURIComponent(reference)}`);
      await settlePurchase(reference, txn);
      purchase = await prisma.tokenPurchase.findUnique({ where: { reference } });
    } catch (e) {
      console.error('Paystack verify failed', e);
    }
  }

  const status = purchase!.status;
  return (
    <div className="card-panel narrow stack" style={{ textAlign: 'center' }}>
      {status === 'SUCCESS' && (
        <>
          <h1>✅ Payment successful</h1>
          <p>🪙 {purchase!.tokens} tokens have been added to your wallet.</p>
        </>
      )}
      {status === 'PENDING' && (
        <>
          <h1>⏳ Waiting for confirmation</h1>
          <p className="muted">
            If you approved the M-PESA prompt, your tokens will appear within a minute. Refresh this page or check your
            wallet.
          </p>
        </>
      )}
      {status === 'FAILED' && (
        <>
          <h1>❌ Payment failed</h1>
          <p className="muted">No money was taken for this attempt. You can try again.</p>
        </>
      )}
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link href="/wallet" className="btn">
          Go to wallet
        </Link>
        <Link href="/" className="btn ghost">
          Browse videos
        </Link>
      </div>
    </div>
  );
}
