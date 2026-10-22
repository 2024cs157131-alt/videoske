import type { MetadataRoute } from 'next';
import { SITE_DOMAIN } from '@/lib/site';

// Search engines may list public pages (home, videos, profiles); private areas stay out.
export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL || `https://${SITE_DOMAIN}`;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/wallet', '/verify', '/chat', '/upload', '/live/', '/login', '/register'],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
