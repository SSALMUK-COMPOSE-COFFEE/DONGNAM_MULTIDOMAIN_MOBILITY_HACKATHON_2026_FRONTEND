import { type NextRequest, NextResponse } from 'next/server';

import { SAAS_PAGES, SESSION_COOKIE_NAME } from '@/consts/route-saas';

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE_NAME)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const loginUrl = request.nextUrl.clone();

  loginUrl.pathname = SAAS_PAGES.LOGIN;
  loginUrl.search = '';
  loginUrl.searchParams.set('next', `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/app', '/app/:path*'],
};
