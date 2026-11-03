import Link from 'next/link';

import '@/app/m2.css';
import { DemoNav } from '@/components/demo-nav';
import { PageWave } from '@/components/page-wave';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/consts/route';
import { IS_SAAS_BUILD, SAAS_PAGES } from '@/consts/route-saas';

function DemoNotFound() {
  return (
    <>
      <DemoNav />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-8 pt-8">
        <div className="flex flex-col items-start gap-4 py-16">
          <h2 className="text-3xl font-bold">없는 화면입니다</h2>
          <p className="text-lg text-muted-foreground">
            주소가 바뀌었거나 잘못 입력되었습니다. 위 단계에서 고르거나 출하 입력부터 시작하세요.
          </p>
          <Button size="lg" asChild>
            <Link href={ROUTES.INTAKE}>출하 입력으로</Link>
          </Button>
        </div>
      </main>
      <PageWave />
    </>
  );
}

function SaasNotFound() {
  return (
    <div data-ui="m2" className="m2-page flex flex-col">
      <div className="m2-main">
        <div className="m2-topline">
          <Link href={SAAS_PAGES.APP} className="m2-logo">
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
              <Link href={SAAS_PAGES.APP} className="m2-btn m2-btn-pri">
                내 화면으로
              </Link>
              <Link href={SAAS_PAGES.LOGIN} className="m2-btn m2-btn-sec">
                로그인
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function NotFound() {
  return IS_SAAS_BUILD ? <SaasNotFound /> : <DemoNotFound />;
}
