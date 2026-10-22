export const SITE_NAME = 'Vidaake';
export const SITE_DOMAIN = 'vidaake.com';
export const SITE_TAGLINE = 'Videos & live from creators you love';

/**
 * The public address used in every link we hand out (referrals, shares, previews, sitemap, payments).
 * Always the brand domain – a SITE_URL pointing at *.vercel.app is ignored so links never show the Vercel address.
 */
export const SITE_URL = (() => {
  const env = process.env.SITE_URL?.trim().replace(/\/$/, '');
  return env && !/\.vercel\.app$/i.test(env) ? env : `https://${SITE_DOMAIN}`;
})();

/** Kept for existing callers – same as SITE_URL. */
export function siteOrigin() {
  return SITE_URL;
}
