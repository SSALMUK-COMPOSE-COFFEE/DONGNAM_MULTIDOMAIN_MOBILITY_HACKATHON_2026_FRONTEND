import type { Metadata } from 'next';
import { Suspense } from 'react';

import { FormSkeleton } from '@/app/(auth)/_components/form-skeleton';
import { LoginForm } from '@/app/(auth)/_components/login-form';

import './login-page.css';

export const metadata: Metadata = {
  title: '로그인 · 프레시스위치',
};

export default function LoginPage() {
  return (
    <div className="fs-login" data-auth-page="login">
      <section className="fs-login-form-section" aria-labelledby="login-title">
        <h1 id="login-title" tabIndex={-1} data-auth-heading>
          로그인
        </h1>
        <p className="fs-login-description">이메일과 비밀번호로 로그인하세요.</p>
        <Suspense fallback={<FormSkeleton />}>
          <LoginForm />
        </Suspense>
      </section>
    </div>
  );
}
