import Link from 'next/link';
import type { ReactNode } from 'react';

import '@/app/m2.css';
import { SAAS_PAGES } from '@/consts/route-saas';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div data-ui="m2" className="m2-page flex flex-col">
      <div className="m2-main">
        <div className="m2-topline">
          <Link href={SAAS_PAGES.LOGIN} className="m2-logo">
            프레시스위치
            <span aria-hidden>≈</span>
          </Link>
        </div>
        <div className="m2-window m2-solo">
          <main className="m2-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
