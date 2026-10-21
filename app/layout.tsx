import './globals.css';
import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import AgeGate from '@/components/AgeGate';
import RefCapture from '@/components/RefCapture';

export const metadata: Metadata = {
  title: 'VideosKE',
  description: 'Adults-only (18+) video platform',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AgeGate />
        <RefCapture />
        <Nav />
        <main className="container">{children}</main>
        <footer className="footer">
          VideosKE · Adults only (18+) · <a href="/terms">Terms &amp; consent policy</a>
        </footer>
      </body>
    </html>
  );
}
