import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { DEFAULT_SETTINGS, type SettingKey } from '@/lib/settings';

export async function POST(req: Request) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);

  const v = Object.fromEntries(
    (Object.keys(DEFAULT_SETTINGS) as SettingKey[]).map((k) => [k, String(b[k] ?? '').trim()]),
  ) as Record<SettingKey, string>;

  if (!/^\d{5,8}$/.test(v.till_number)) return bad('Till number must be 5–8 digits.');
  if (!v.till_name || v.till_name.length > 60) return bad('Till name is required (max 60 characters).');
  const min = parseInt(v.price_min, 10);
  const max = parseInt(v.price_max, 10);
  if (!(min >= 1 && max >= min && max <= 150000)) return bad('Prices must be whole numbers with min ≤ max.');
  if (!['true', 'false'].includes(v.daraja_required)) return bad('Invalid Daraja setting.');
  const age = parseInt(v.payment_max_age_hours, 10);
  if (!(age >= 1 && age <= 720)) return bad('Payment age must be 1–720 hours.');

  v.till_name = v.till_name.toUpperCase();
  v.price_min = String(min);
  v.price_max = String(max);
  v.payment_max_age_hours = String(age);

  await prisma.$transaction(
    (Object.keys(v) as SettingKey[]).map((key) =>
      prisma.setting.upsert({ where: { key }, create: { key, value: v[key] }, update: { value: v[key] } }),
    ),
  );
  return NextResponse.json({ ok: true });
}
