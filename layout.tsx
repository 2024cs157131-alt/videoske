import './globals.css';
import type { Metadata, Viewport } from 'next';
import Nav from '@/components/Nav';
import AgeGate from '@/components/AgeGate';
import RefCapture from '@/components/RefCapture';
import PauseOnHide from '@/components/PauseOnHide';
import { SITE_DOMAIN, SITE_NAME, SITE_TAGLINE } from '@/lib/site';

const siteUrl = process.env.SITE_URL || `https://${SITE_DOMAIN}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${SITE_NAME} – ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description:
    'Watch free and premium videos and live streams from verified creators. Creators earn from views, premium videos and paid live shows. 18+.',
  applicationName: SITE_NAME,
  openGraph: { siteName: SITE_NAME, type: 'website', url: siteUrl, title: `${SITE_NAME} – ${SITE_TAGLINE}` },
  twitter: { card: 'summary' },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  other: { rating: 'adult' },
};

export const viewport: Viewport = {
  themeColor: '#0f0f12',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <html lang="en">
      <head>
        {/* Start connecting to the video/image host early */}
        {supabase && <link rel="preconnect" href={supabase} crossOrigin="" />}
        {supabase && <link rel="dns-prefetch" href={supabase} />}
      </head>
      <body>
        <AgeGate />
        <RefCapture />
        <PauseOnHide />
        <Nav />
        <main className="container">{children}</main>
        <footer className="footer">
          © {SITE_NAME} · {SITE_DOMAIN} · Adults only (18+) · <a href="/terms">Terms &amp; consent policy</a>
        </footer>
      </body>
    </html>
  );
}
