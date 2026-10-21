import { randomInt } from 'crypto';
import { prisma } from './db';

export const DEFAULT_SETTINGS = {
  till_number: '123456',
  till_name: 'VIDEOSKE',
  price_min: '150',
  price_max: '200',
  daraja_required: 'false',
  payment_max_age_hours: '24',
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof Settings;

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const s: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in s) s[r.key as SettingKey] = r.value;
  return s;
}

/** Random whole-shilling price between price_min and price_max (inclusive). */
export async function randomPrice() {
  const s = await getSettings();
  const min = parseInt(s.price_min, 10) || 150;
  const max = Math.max(min, parseInt(s.price_max, 10) || 200);
  return randomInt(min, max + 1);
}
