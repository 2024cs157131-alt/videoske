import { NextResponse } from 'next/server';
import { SITE_URL } from '@/lib/site';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { getSettings, usdRate } from '@/lib/settings';
import { normalizeKePhone, paystack, paystackConfigured } from '@/lib/paystack';
import { visitorCountry } from '@/lib/pricing';

// Start the creator-verification payment.
// Kenya: M-PESA only – the paying number becomes the payout number.
// Elsewhere: card – payouts go to the bank account entered here.
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;
  if (!paystackConfigured()) return bad('Payments are not set up yet.', 503);
  if (!user.email) return bad('Your account needs an email address to pay.');
  if (user.verified) return bad('You are already verified.');

  const b = await readJson(req);
  const name = String(b.name ?? '').trim().slice(0, 100);
  if (name.length < 3) return bad('Enter your full name as it appears on your M-PESA or bank account.');

  const kenya = visitorCountry() === 'KE';
  let meta: Record<string, string>;
  if (kenya) {
    const phone = normalizeKePhone(String(b.phone ?? ''));
    if (!phone) return bad('Enter a valid Safaricom number, e.g. 0712345678.');
    meta = { method: 'MPESA', name, phone };
  } else {
    const bank = String(b.bank ?? '').trim().slice(0, 100);
    const account = String(b.account ?? '').trim().slice(0, 50);
    const swift = String(b.swift ?? '').trim().toUpperCase().slice(0, 20);
    const country = String(b.country ?? '').trim().slice(0, 60);
    if (!bank || account.length < 5 || !country) return bad('Enter your bank name, account number (or IBAN) and country.');
    meta = { method: 'BANK', name, bank, account, swift, country };
  }

  const s = await getSettings();
  const feeKes = parseInt(s.verification_fee_kes, 10) || 200;
  const currency = !kenya && s.usd_enabled === 'true' ? 'USD' : 'KES';
  const amount = currency === 'KES' ? feeKes * 100 : Math.round((feeKes / usdRate(s)) * 100);

  const reference = `vkv_${randomUUID().replace(/-/g, '')}`;
  await prisma.tokenPurchase.create({
    data: { reference, userId: user.id, tokens: 0, amount, currency, purpose: 'VERIFICATION', meta },
  });

  const origin = SITE_URL; // Paystack sends buyers back to vidaake.com
  try {
    const init = await paystack<{ authorization_url: string }>('/transaction/initialize', {
      method: 'POST',
      body: {
        email: user.email,
        amount,
        currency,
        reference,
        callback_url: `${origin}/wallet/callback`,
        channels: kenya ? ['mobile_money'] : ['card'],
        metadata: { userId: user.id, purpose: 'verification' },
      },
    });
    return NextResponse.json({ url: init.authorization_url });
  } catch (e) {
    await prisma.tokenPurchase.update({ where: { reference }, data: { status: 'FAILED' } });
    return bad(`Could not start payment: ${(e as Error).message}`, 502);
  }
}
