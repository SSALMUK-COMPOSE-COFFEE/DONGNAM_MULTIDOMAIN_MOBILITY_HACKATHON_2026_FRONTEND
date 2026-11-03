import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { DemoLoginPanel } from '@/app/(auth)/_components/demo-login-panel';
import { FormSkeleton, RoleSkeleton } from '@/app/(auth)/_components/form-skeleton';
import { LoginForm } from '@/app/(auth)/_components/login-form';
import { LoginShowcase } from '@/app/(auth)/_components/login-showcase';
import { MapLinkProvider } from '@/components/map-link';
import { SAAS_PAGES } from '@/consts/route-saas';

export const metadata: Metadata = {
  title: '로그인 · 프레시스위치',
};

export default function LoginPage() {
  return (
    <MapLinkProvider>
      <div className="m2-head">
        <div>
          <div className="m2-eyebrow">부산·울산권 신선 농산물 수출 공동적재</div>
          <h1 className="m2-h1">작은 화물끼리 한 컨테이너를 같이 타게 합니다</h1>
          <p className="m2-sub">
            딸기·샤인머스캣 화주의 LCL 화물을 묶고, 선과장 집하 경로와 콜드체인까지 한 계획으로
            관리합니다.
          </p>
        </div>
      </div>

      <LoginShowcase />

      <div className="m2-grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] max-[1180px]:grid-cols-2">
        <section className="m2-card" aria-labelledby="login-title">
          <h2 id="login-title" className="m2-h2">
            로그인
          </h2>
          <p className="m2-sub mb-4">조직 계정으로 들어갑니다.</p>
          <Suspense fallback={<FormSkeleton />}>
            <LoginForm />
          </Suspense>
          <p className="m2-sub mt-3 text-xs">
            계정이 없나요?{' '}
            <Link href={SAAS_PAGES.SIGNUP} className="font-semibold text-m2-brand-ink">
              회사 가입하기
            </Link>
          </p>
        </section>

        <section className="m2-card" aria-labelledby="demo-login-title">
          <div className="m2-card-h">
            <div>
              <h2 id="demo-login-title" className="m2-h2">
                데모 계정으로 둘러보기
              </h2>
              <p className="m2-sub">비밀번호 없이 역할별로 바로 들어갑니다 · 예시 조직 데이터</p>
            </div>
          </div>
          <Suspense fallback={<RoleSkeleton />}>
            <DemoLoginPanel />
          </Suspense>
        </section>
      </div>
    </MapLinkProvider>
  );
}
