'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { type ReactNode, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { LoginMapBackground } from '@/app/(auth)/_components/login-map-background';
import { Button } from '@/components/ui/button';
import { SAAS_PAGES, safeNextPath } from '@/consts/route-saas';

import './auth-shell.css';

export function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const page = pathname === SAAS_PAGES.SIGNUP ? 'signup' : 'login';
  const mainRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const previousPath = useRef(pathname);

  useLayoutEffect(() => {
    const active = contentRef.current?.querySelector<HTMLElement>(`[data-auth-page="${page}"]`);
    if (!active) return;
    const measure = () => setCardHeight(Math.ceil(active.getBoundingClientRect().height) + 50);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(active);
    return () => observer.disconnect();
  }, [page]);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    mainRef.current?.querySelector('.fs-auth-card-frame')?.scrollTo({ top: 0 });
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
    const timer = window.setTimeout(() => {
      mainRef.current
        ?.querySelector<HTMLElement>(`[data-auth-page="${page}"] [data-auth-heading]`)
        ?.focus({ preventScroll: true });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [pathname, page]);

  return (
    <div className="fs-auth" data-page={page}>
      <LoginMapBackground />
      <header className="fs-auth-header">
        <Link href="/" className="fs-auth-wordmark" aria-label="프레시스위치 홈">
          프레시스위치 <span aria-hidden>≈</span>
        </Link>
        <Link href="/" className="fs-auth-back">
          <ArrowLeft size={14} aria-hidden />
          서비스 소개
        </Link>
      </header>
      <main className="fs-auth-body" ref={mainRef}>
        <div
          className="fs-auth-card-frame"
          style={cardHeight === null ? {} : { height: cardHeight }}
        >
          <Suspense
            fallback={
              <Button variant="ghost" size="sm" className="fs-auth-switch" disabled>
                {page === 'login' ? '업체 가입' : '로그인'}
                <span aria-hidden>→</span>
              </Button>
            }
          >
            <AuthSwitch page={page} />
          </Suspense>
          <div className="fs-auth-card-content" ref={contentRef}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function AuthSwitch({ page }: { page: 'login' | 'signup' }) {
  const next = safeNextPath(useSearchParams().get('next'));
  const destination = page === 'login' ? SAAS_PAGES.SIGNUP : SAAS_PAGES.LOGIN;
  const href = next ? `${destination}?${new URLSearchParams({ next })}` : destination;

  return (
    <Button asChild variant="ghost" size="sm" className="fs-auth-switch">
      <Link href={href}>
        {page === 'login' ? '업체 가입' : '로그인'}
        <span aria-hidden>→</span>
      </Link>
    </Button>
  );
}
