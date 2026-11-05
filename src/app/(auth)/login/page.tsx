import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { DemoLoginPanel } from '@/app/(auth)/_components/demo-login-panel';
import { FormSkeleton, RoleSkeleton } from '@/app/(auth)/_components/form-skeleton';
import { LoginCredentialsProvider } from '@/app/(auth)/_components/login-credentials';
import { LoginForm } from '@/app/(auth)/_components/login-form';
import { LoginMapBackground } from '@/app/(auth)/_components/login-map-background';
import { SAAS_PAGES } from '@/consts/route-saas';

import './login-page.css';

export const metadata: Metadata = {
  title: '로그인 · 프레시스위치',
};

export default function LoginPage() {
  return (
    <div className="fs-login">
      <LoginMapBackground />
      <header className="fs-login-header">
        <Link href="/" className="fs-login-wordmark" aria-label="프레시스위치 홈">
          프레시스위치 <span aria-hidden>≈</span>
        </Link>
        <Link href="/" className="fs-login-back">
          <ArrowLeft size={14} aria-hidden /> 서비스 소개
        </Link>
      </header>
      <LoginCredentialsProvider>
        <div className="fs-login-columns">
          <div className="fs-login-panel">
            <section className="fs-login-form-section" aria-labelledby="login-title">
              <h1 id="login-title">로그인</h1>
              <p className="fs-login-description">이메일과 비밀번호로 로그인하세요.</p>
              <Suspense fallback={<FormSkeleton />}>
                <LoginForm />
              </Suspense>
              <p className="fs-login-signup">
                처음 이용하시나요? <Link href={SAAS_PAGES.SIGNUP}>회사 가입하기</Link>
              </p>
            </section>
            <section className="fs-login-demo-section" aria-label="서비스 체험">
              <Suspense fallback={<RoleSkeleton />}>
                <DemoLoginPanel />
              </Suspense>
            </section>
          </div>
        </div>
      </LoginCredentialsProvider>
    </div>
  );
}
