import { NextResponse } from 'next/server';
import { verifySignature } from '@/lib/paystack';
import { settlePurchase } from '@/lib/tokens';

// Paystack webhook. Set this URL in Paystack Dashboard → Settings → API Keys & Webhooks:
//   https://YOUR-SITE/api/paystack/webhook
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('x-paystack-signature'))) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const evt = JSON.parse(raw);
  const d = evt?.data;
  if (d?.reference && (evt.event === 'charge.success' || evt.event === 'charge.failed')) {
    await settlePurchase(String(d.reference), {
      status: evt.event === 'charge.success' ? String(d.status) : 'failed',
      amount: Number(d.amount),
      currency: String(d.currency),
      channel: d.channel ? String(d.channel) : undefined,
      customer: d.customer ?? null,
      authorization: d.authorization ?? null,
    });
  }
  return NextResponse.json({ received: true });
}
