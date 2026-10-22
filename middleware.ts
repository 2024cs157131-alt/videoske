import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/jwt';
import { SITE_URL } from '@/lib/site';

// Pages that need a logged-in member
const PROTECTED = ['/upload', '/new', '/settings', '/notifications', '/analytics', '/wallet', '/verify', '/chat', '/live', '/admin'];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get('host') ?? '';

  // Visitors on the old production address (videoske.vercel.app) are sent to vidaake.com.
  // API routes are excluded (see matcher) so Paystack webhooks keep working on either address.
  if (process.env.VERCEL_ENV === 'production' && host.endsWith('.vercel.app')) {
    return NextResponse.redirect(`${SITE_URL}${pathname}${search}`, 308);
  }

  const needsLogin = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!needsLogin) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith('/admin') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Every page, but not API routes, Next.js assets or files like /icon.svg
  matcher: ['/((?!api/|_next/|.*\\.[a-z0-9]+$).*)'],
};
