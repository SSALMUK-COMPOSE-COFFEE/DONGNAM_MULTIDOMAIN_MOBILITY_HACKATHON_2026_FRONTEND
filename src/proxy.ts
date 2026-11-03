import { type NextRequest, NextResponse } from 'next/server';

import { ROUTES } from '@/consts/route';
import { IS_SAAS_BUILD, SAAS_PAGES, SESSION_COOKIE_NAME } from '@/consts/route-saas';

const DEMO_PATHS: readonly string[] = Object.values(ROUTES);

const isDemoPath = (pathname: string) =>
  pathname === '/' || DEMO_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (isDemoPath(pathname)) {
    if (!IS_SAAS_BUILD) return NextResponse.next();

    const entryUrl = request.nextUrl.clone();

    entryUrl.pathname = pathname === '/' && hasSession ? SAAS_PAGES.APP : SAAS_PAGES.LOGIN;
    entryUrl.search = '';

    return NextResponse.redirect(entryUrl);
  }

  if (hasSession) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = SAAS_PAGES.LOGIN;
  loginUrl.search = '';
  loginUrl.searchParams.set('next', `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/',
    '/intake/:path*',
    '/plan/:path*',
    '/replan/:path*',
    '/mode-switch/:path*',
    '/fuel-shock/:path*',
    '/sensor/:path*',
    '/app',
    '/app/:path*',
  ],
};
