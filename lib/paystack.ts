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

export type PaystackTxn = {
  status: string;
  amount: number;
  currency: string;
  channel?: string;
  reference: string;
  customer?: { phone?: string | null } | null; // for M-PESA payments: the number that paid
  authorization?: { bank?: string | null; last4?: string | null; brand?: string | null } | null;
};

/** "+254712345678" / "0712345678" / "254712345678" → "254712345678"; null if not a Kenyan mobile number. */
export function normalizeKePhone(p?: string | null) {
  const d = String(p ?? '').replace(/[\s-]/g, '').replace(/^\+/, '');
  const m = d.match(/^(?:254|0)?([17]\d{8})$/);
  return m ? `254${m[1]}` : null;
}
