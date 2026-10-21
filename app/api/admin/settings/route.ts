import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { DEFAULT_SETTINGS, type SettingKey } from '@/lib/settings';

const int = (v: string) => (/^\d+$/.test(v) ? parseInt(v, 10) : NaN);

export async function POST(req: Request) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);

  const v = Object.fromEntries(
    (Object.keys(DEFAULT_SETTINGS) as SettingKey[]).map((k) => [k, String(b[k] ?? '').trim()]),
  ) as Record<SettingKey, string>;

  const min = int(v.price_min);
  const max = int(v.price_max);
  if (!(min >= 1 && max >= min && max <= 1_000_000)) return bad('Premium price: whole numbers, min ≤ max.');
  const kes = parseFloat(v.token_price_kes);
  const rate = parseFloat(v.usd_rate);
  if (!(kes > 0)) return bad('KES per token must be greater than 0.');
  if (!(rate >= 1 && rate <= 10000)) return bad('Conversion rate must be KES per 1 USD, e.g. 130.');
  if (isNaN(int(v.referral_reward)) || isNaN(int(v.referral_min_purchase))) return bad('Referral settings must be whole numbers.');
  const pkgs = v.token_packages.split(',').map((x) => int(x.trim()));
  if (!pkgs.length || pkgs.some((n) => !(n > 0))) return bad('Token packages: whole numbers separated by commas, e.g. 100,500,1000');
  if (!['true', 'false'].includes(v.usd_enabled)) return bad('Invalid USD setting.');
  const commission = int(v.commission_percent);
  if (!(commission >= 0 && commission <= 100)) return bad('Commission must be 0–100%.');
  if (!(int(v.payout_min_tokens) >= 1)) return bad('Minimum payout must be at least 1 token.');
  if (isNaN(int(v.native_ad_every)) || isNaN(int(v.interstitial_minutes))) return bad('Ad settings must be whole numbers (0 = off).');

  v.token_packages = pkgs.join(',');

  await prisma.$transaction(
    (Object.keys(v) as SettingKey[]).map((key) =>
      prisma.setting.upsert({ where: { key }, create: { key, value: v[key] }, update: { value: v[key] } }),
    ),
  );
  return NextResponse.json({ ok: true });
}
