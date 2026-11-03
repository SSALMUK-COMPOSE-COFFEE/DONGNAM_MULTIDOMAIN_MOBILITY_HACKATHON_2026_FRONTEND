import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { FormSkeleton } from '@/app/(auth)/_components/form-skeleton';
import { SignupForm } from '@/app/(auth)/_components/signup-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SAAS_PAGES } from '@/consts/route-saas';

export const metadata: Metadata = {
  title: '회사 가입 · 프레시스위치',
};

export default function SignupPage() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>회사 가입</CardTitle>
        <CardDescription>
          화주 또는 포워더로 가입합니다. 가입한 사람이 그 회사의 관리자가 됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Suspense fallback={<FormSkeleton rows={5} />}>
          <SignupForm />
        </Suspense>
        <p className="text-sm text-muted-foreground">
          이미 계정이 있나요?{' '}
          <Link href={SAAS_PAGES.LOGIN} className="font-bold text-brand">
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
