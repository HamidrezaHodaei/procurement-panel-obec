import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Gatekeeper: pages under /dashboard and /print need the Flask session cookie, otherwise the
 * visitor is sent to /login. This is only a fast redirect — the real authorization (valid
 * session, role) is enforced by the Flask API on every request.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const protectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/print');
  if (protectedPath && !req.cookies.get('proc_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/print/:path*']
};
