import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { getSettings, packagePrice, tokenPackages } from '@/lib/settings';
import { paystack, paystackConfigured } from '@/lib/paystack';
import { visitorCountry } from '@/lib/pricing';

// Start a Paystack payment for a token package; returns the Paystack checkout URL.
// Kenya: KES via M-PESA or card. Elsewhere: USD card (if enabled), otherwise KES card.
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;
  if (!paystackConfigured()) return bad('Payments are not set up yet.', 503);
  if (!user.email) return bad('Your account needs an email address to pay.');

  const b = await readJson(req);
  const s = await getSettings();
  const tokens = parseInt(String(b.tokens ?? ''), 10);
  if (!tokenPackages(s).includes(tokens)) return bad('Choose one of the token packages.');

  const kenya = visitorCountry() === 'KE';
  const currency = !kenya && s.usd_enabled === 'true' ? 'USD' : 'KES';
  const amount = packagePrice(s, tokens, currency);
  if (amount < 100) return bad('This package is priced too low to charge.');

  const reference = `vk_${randomUUID().replace(/-/g, '')}`;
  await prisma.tokenPurchase.create({ data: { reference, userId: user.id, tokens, amount, currency } });

  const origin = (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
  try {
    const init = await paystack<{ authorization_url: string }>('/transaction/initialize', {
      method: 'POST',
      body: {
        email: user.email,
        amount,
        currency,
        reference,
        callback_url: `${origin}/wallet/callback`,
        channels: kenya ? ['mobile_money', 'card'] : ['card'],
        metadata: { userId: user.id, tokens, purpose: 'tokens' },
      },
    });
    return NextResponse.json({ url: init.authorization_url });
  } catch (e) {
    await prisma.tokenPurchase.update({ where: { reference }, data: { status: 'FAILED' } });
    return bad(`Could not start payment: ${(e as Error).message}`, 502);
  }
}
