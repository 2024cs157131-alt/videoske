import './globals.css';
import type { Metadata, Viewport } from 'next';
import Nav from '@/components/Nav';
import AgeGate from '@/components/AgeGate';
import RefCapture from '@/components/RefCapture';
import PauseOnHide from '@/components/PauseOnHide';
import UpgradeModal from '@/components/UpgradeModal';
import TabBar from '@/components/TabBar';
import { navCounts } from '@/lib/nav';
import { publicUrl } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { getPricing, priceLabel } from '@/lib/pricing';
import { SITE_DOMAIN, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';

const siteUrl = SITE_URL;

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Free (unverified) members get the "get verified" modal
  const user = await getCurrentUser();
  const upgrade = user && !user.verified && user.role !== 'ADMIN' ? await getSettings() : null;
  const alerts = user ? (await navCounts(user.id)).alerts : 0;
  const upgradeFee = upgrade ? priceLabel(parseInt(upgrade.verification_fee_kes, 10) || 200, await getPricing(upgrade)) : '';
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
        {upgrade && (
          <UpgradeModal
            fee={upgradeFee}
            viewsRate={parseInt(upgrade.views_rate, 10) || 0}
            creatorPercent={100 - (parseInt(upgrade.commission_percent, 10) || 30)}
          />
        )}
        <main className="container">{children}</main>
        <footer className="footer">
          © {SITE_NAME} · {SITE_DOMAIN} · Adults only (18+) · <a href="/terms">Terms &amp; consent policy</a>
          {user && (
            <form action="/api/auth/logout" method="post" style={{ display: 'inline' }}>
              {' · '}
              <button className="link muted small">Log out</button>
            </form>
          )}
        </footer>
        <TabBar
          me={user ? { username: user.username, displayName: user.displayName, avatarUrl: publicUrl(user.avatarPath) } : null}
          alerts={alerts}
        />
      </body>
    </html>
  );
}
