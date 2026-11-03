'use client';

import { isAxiosError } from 'axios';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { useMe } from '@/apis/saas/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SAAS_PAGES, orgTypeOfPath, roleHome } from '@/consts/route-saas';

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();

  const activeType = me.data?.active_org.org_type ?? null;
  const redirectTo =
    activeType && orgTypeOfPath(pathname) !== activeType ? roleHome(activeType) : null;
  const isUnauthorized = isAxiosError(me.error) && me.error.response?.status === 401;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  useEffect(() => {
    if (isUnauthorized) {
      router.replace(`${SAAS_PAGES.LOGIN}?next=${encodeURIComponent(pathname)}`);
    }
  }, [isUnauthorized, pathname, router]);

  if (me.isError && !isUnauthorized) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4">
        <p className="text-lg font-bold text-navy">계정 정보를 불러오지 못했습니다.</p>
        <p className="text-muted-foreground">서버 연결을 확인하고 다시 시도하세요.</p>
        <Button variant="outline" onClick={() => me.refetch()} disabled={me.isFetching}>
          {me.isFetching ? '다시 시도 중' : '다시 시도'}
        </Button>
      </div>
    );
  }

  if (!me.data || redirectTo) return <ShellSkeleton />;

  return children;
}

function ShellSkeleton() {
  return (
    <div aria-busy className="flex flex-1">
      <div className="flex w-72 shrink-0 flex-col gap-4 border-r bg-white/85 px-5 py-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-6 px-8 pt-8">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
