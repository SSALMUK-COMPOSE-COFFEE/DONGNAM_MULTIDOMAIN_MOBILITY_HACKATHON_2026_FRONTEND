import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { FormSkeleton } from '@/app/(auth)/_components/form-skeleton';
import { SignupForm } from '@/app/(auth)/_components/signup-form';
import { SAAS_PAGES } from '@/consts/route-saas';

export const metadata: Metadata = {
  title: '회사 가입 · 프레시스위치',
};

export default function SignupPage() {
  return (
    <>
      <div className="m2-head">
        <div>
          <div className="m2-eyebrow">부산·울산권 신선 농산물 수출 공동적재</div>
          <h1 className="m2-h1">회사 가입</h1>
          <p className="m2-sub">
            화주 또는 포워더로 가입합니다. 가입한 사람이 그 회사의 관리자가 됩니다.
          </p>
        </div>
      </div>

      <section className="m2-card max-w-[560px]" aria-labelledby="signup-title">
        <h2 id="signup-title" className="m2-h2">
          회사 정보
        </h2>
        <p className="m2-sub mb-4">회사와 담당자 정보를 넣으면 바로 시작할 수 있습니다.</p>
        <Suspense fallback={<FormSkeleton rows={5} />}>
          <SignupForm />
        </Suspense>
        <p className="m2-sub mt-3 text-xs">
          이미 계정이 있나요?{' '}
          <Link href={SAAS_PAGES.LOGIN} className="font-semibold text-m2-brand-ink">
            로그인
          </Link>
        </p>
      </section>
    </>
  );
}
