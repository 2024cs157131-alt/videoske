import { randomInt } from 'crypto';
import { prisma } from './db';

export const DEFAULT_SETTINGS = {
  price_min: '150', // premium video price range, in tokens
  price_max: '200',
  token_price_kes: '1', // KES per token (1 token = KSh 1)
  usd_rate: '130', // conversion rate: KES per 1 USD (used to show/charge USD to non-Kenyans)
  token_packages: '100,200,500,1000,2000', // token amounts users can buy
  usd_enabled: 'false', // charge non-Kenyans in USD (enable USD on your Paystack account first)
  commission_percent: '30', // platform share of every token spend
  payout_min_tokens: '1000', // minimum withdrawal
  referral_reward: '50', // tokens (= KSh) paid to the referrer per active member
  referral_min_purchase: '100', // a referred member is "active" after buying at least this many tokens
  verification_fee_kes: '200', // one-off fee to become a verified creator
  views_rate: '20', // tokens (= KSh) a verified creator earns per 1000 unique views of a free video
  auto_publish: 'true', // new videos go live without admin review
  auto_hide_reports: '3', // hide a video once it has this many open reports (0 = never)
  auto_approve_live: 'false', // live streams go live without admin approval
  native_ad_every: '8', // show a native ad after every N videos in the feed (0 = off)
  interstitial_minutes: '10', // show an interstitial at most once every N minutes (0 = off)
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const s: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in s) s[r.key as SettingKey] = r.value;
  return s;
}

/** Random whole-token price for a new premium video, between price_min and price_max (inclusive). */
export async function randomPrice() {
  const s = await getSettings();
  const min = parseInt(s.price_min, 10) || 150;
  const max = Math.max(min, parseInt(s.price_max, 10) || 200);
  return randomInt(min, max + 1);
}

export function tokenPackages(s: Settings) {
  return s.token_packages
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => n > 0 && n <= 1_000_000);
}

export const kesPerToken = (s: Settings) => parseFloat(s.token_price_kes) || 1;
export const usdRate = (s: Settings) => parseFloat(s.usd_rate) || 130;

/** Price of `tokens` in Paystack subunits (cents). USD is converted from KES with usd_rate. */
export function packagePrice(s: Settings, tokens: number, currency: 'KES' | 'USD') {
  const kes = tokens * kesPerToken(s);
  return Math.round((currency === 'KES' ? kes : kes / usdRate(s)) * 100);
}

export function commissionPercent(s: Settings) {
  const c = parseInt(s.commission_percent, 10);
  return isNaN(c) ? 30 : Math.min(100, Math.max(0, c));
}

export const money = (subunits: number, currency: string) =>
  currency === 'USD'
    ? `$${(subunits / 100).toFixed(2)}`
    : `KSh ${(subunits / 100).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
