import Link from 'next/link';

import '@/app/m2.css';
import { PageWave } from '@/components/page-wave';
import { SAAS_PAGES } from '@/consts/route-saas';

export default function NotFound() {
  return (
    <div data-ui="m2" className="m2-page flex flex-col">
      <div className="m2-main">
        <div className="m2-topline">
          <Link href="/" className="m2-logo">
            프레시스위치
            <span aria-hidden>≈</span>
          </Link>
        </div>
        <div className="m2-window m2-solo">
          <main className="m2-content flex min-h-80 flex-col items-center justify-center gap-3 text-center">
            <p className="m2-eyebrow">404</p>
            <h1 className="m2-h1">없는 화면입니다</h1>
            <p className="m2-sub">주소가 바뀌었거나 잘못 입력되었습니다.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link href="/" className="m2-btn m2-btn-pri">
                처음으로
              </Link>
              <Link href={SAAS_PAGES.LOGIN} className="m2-btn m2-btn-sec">
                로그인
              </Link>
            </div>
          </main>
        </div>
        <PageWave />
      </div>
    </div>
  );
}
