import { headers } from 'next/headers';
import { getSettings, kesPerToken, usdRate, type Settings } from './settings';

/** Visitor's country from Vercel's geo header ("KE", "US", ...). Local development counts as Kenya. */
export function visitorCountry() {
  return (headers().get('x-vercel-ip-country') || 'KE').toUpperCase();
}

export type Pricing = { kenya: boolean; kesPerToken: number; usdRate: number };

export async function getPricing(s?: Settings): Promise<Pricing> {
  const settings = s ?? (await getSettings());
  return { kenya: visitorCountry() === 'KE', kesPerToken: kesPerToken(settings), usdRate: usdRate(settings) };
}

/** "KSh 175" for Kenyans, "$1.35" for everyone else. */
export function priceLabel(tokens: number, p: Pricing) {
  const kes = tokens * p.kesPerToken;
  return p.kenya ? `KSh ${kes.toLocaleString('en-KE')}` : `$${(kes / p.usdRate).toFixed(2)}`;
}
