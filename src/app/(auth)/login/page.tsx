import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { DemoLoginPanel } from '@/app/(auth)/_components/demo-login-panel';
import { FormSkeleton } from '@/app/(auth)/_components/form-skeleton';
import { LoginForm } from '@/app/(auth)/_components/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SAAS_PAGES } from '@/consts/route-saas';

export const metadata: Metadata = {
  title: '로그인 · 프레시스위치',
};

export default function LoginPage() {
  return (
    <div className="grid w-full max-w-5xl grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>회사 계정으로 출하 · 계획 · 정산을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Suspense fallback={<FormSkeleton />}>
            <LoginForm />
          </Suspense>
          <p className="text-sm text-muted-foreground">
            계정이 없나요?{' '}
            <Link href={SAAS_PAGES.SIGNUP} className="font-bold text-brand">
              회사 가입하기
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>데모 계정으로 둘러보기</CardTitle>
          <CardDescription>
            예시 조직 데이터로 역할별 화면을 바로 열어 봅니다. 실제 거래 데이터는 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormSkeleton rows={3} />}>
            <DemoLoginPanel />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
