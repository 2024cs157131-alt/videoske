import { createHmac, timingSafeEqual } from 'crypto';

const BASE = 'https://api.paystack.co';

function secret() {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error('PAYSTACK_SECRET_KEY is not set');
  return k;
}

export const paystackConfigured = () => !!process.env.PAYSTACK_SECRET_KEY;

export async function paystack<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(BASE + path, {
    method: init?.method ?? 'GET',
    headers: { Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) throw new Error(data.message || `Paystack error (${res.status})`);
  return data.data as T;
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using your secret key. */
export function verifySignature(raw: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac('sha512', secret()).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PaystackTxn = { status: string; amount: number; currency: string; channel?: string; reference: string };
