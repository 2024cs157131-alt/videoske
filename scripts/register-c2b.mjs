// Registers your confirmation/validation URLs with Safaricom Daraja (run once after deploying).
// Usage: npm run c2b:register   (reads .env)
const {
  DARAJA_CONSUMER_KEY,
  DARAJA_CONSUMER_SECRET,
  DARAJA_SHORTCODE,
  SITE_URL,
  C2B_CALLBACK_SECRET,
  DARAJA_ENV = 'production',
} = process.env;

for (const [k, v] of Object.entries({ DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET, DARAJA_SHORTCODE, SITE_URL, C2B_CALLBACK_SECRET })) {
  if (!v) throw new Error(`Missing ${k} in .env`);
}

const base = DARAJA_ENV === 'sandbox' ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
const basic = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64');

const tokenRes = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
  headers: { Authorization: `Basic ${basic}` },
});
const { access_token } = await tokenRes.json();
if (!access_token) throw new Error(`Could not get Daraja token (HTTP ${tokenRes.status})`);

const site = SITE_URL.replace(/\/$/, '');
const res = await fetch(`${base}/mpesa/c2b/v2/registerurl`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ShortCode: DARAJA_SHORTCODE,
    ResponseType: 'Completed',
    ConfirmationURL: `${site}/api/payments/c2b/confirm?key=${C2B_CALLBACK_SECRET}`,
    ValidationURL: `${site}/api/payments/c2b/validate?key=${C2B_CALLBACK_SECRET}`,
  }),
});
console.log(res.status, await res.text());
