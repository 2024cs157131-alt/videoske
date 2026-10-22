import { headers } from 'next/headers';

export const SITE_NAME = 'Vidaake';
export const SITE_DOMAIN = 'vidaake.com';
export const SITE_TAGLINE = 'Videos & live from creators you love';

/** Absolute site address: SITE_URL if set (https://vidaake.com), otherwise the current host. */
export function siteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host') || SITE_DOMAIN;
  return `https://${host}`;
}
