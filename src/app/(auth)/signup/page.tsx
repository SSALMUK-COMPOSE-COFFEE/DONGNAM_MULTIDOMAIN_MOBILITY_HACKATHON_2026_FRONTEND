import type { Metadata } from 'next';
import { Suspense } from 'react';

import { FormSkeleton } from '@/app/(auth)/_components/form-skeleton';
import { SignupForm } from '@/app/(auth)/_components/signup-form';

import './signup-page.css';

export const metadata: Metadata = { title: '업체 가입 · 프레시스위치' };

export default function SignupPage() {
  return (
    <section className="fs-signup" data-auth-page="signup" aria-labelledby="signup-title">
      <header className="fs-signup-heading">
        <h1 id="signup-title" tabIndex={-1} data-auth-heading>
          업체 가입
        </h1>
        <p>업체와 담당자 정보를 입력하세요. 가입한 담당자가 업체 관리자가 됩니다.</p>
      </header>
      <Suspense fallback={<FormSkeleton rows={5} />}>
        <SignupForm />
      </Suspense>
    </section>
  );
}
