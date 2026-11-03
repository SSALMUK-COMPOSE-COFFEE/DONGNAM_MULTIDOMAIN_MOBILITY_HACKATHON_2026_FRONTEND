'use client';

import { isAxiosError } from 'axios';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import { useMe } from '@/apis/saas/auth';
import { useRoleSwitchStore } from '@/app/(saas)/app/_components/use-role-switch';
import { Skeleton } from '@/components/ui/skeleton';
import { orgTypeOfPath, roleHome } from '@/consts/route-saas';

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  const switchTarget = useRoleSwitchStore(state => state.target);

  const activeType = me.data?.active_org.org_type ?? null;
  const fitsTarget = switchTarget !== null && orgTypeOfPath(switchTarget) === activeType;
  const isMismatch = activeType !== null && orgTypeOfPath(pathname) !== activeType;
  const hasArrived = fitsTarget && !isMismatch;
  let redirectTo: string | null = null;

  if (activeType && isMismatch) redirectTo = fitsTarget ? switchTarget : roleHome(activeType);
  const isUnauthorized = isAxiosError(me.error) && me.error.response?.status === 401;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  useEffect(() => {
    if (hasArrived || isUnauthorized) useRoleSwitchStore.getState().setTarget(null);
  }, [hasArrived, isUnauthorized]);

  if (me.isError && !isUnauthorized) {
    return (
      <div className="m2-main">
        <div className="m2-window m2-solo">
          <div className="m2-content flex min-h-80 flex-col items-center justify-center gap-3 text-center">
            <p className="m2-h2">계정 정보를 불러오지 못했습니다.</p>
            <p className="m2-sub">서버 연결을 확인하고 다시 시도하세요.</p>
            <button
              type="button"
              className="m2-btn m2-btn-sec mt-2"
              onClick={() => me.refetch()}
              disabled={me.isFetching}
            >
              {me.isFetching ? '다시 시도 중' : '다시 시도'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!me.data || redirectTo) return <ShellSkeleton />;

  return children;
}

function ShellSkeleton() {
  return (
    <div aria-busy className="m2-main">
      <div className="m2-topline">
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="m2-window">
        <div className="m2-side">
          <div className="m2-side-in gap-3">
            <div className="m2-org">
              <Skeleton className="size-[34px] shrink-0 rounded-[10px]" />
              <div className="m2-org-text flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
        <div className="m2-content flex flex-col gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-[18px]" />
        </div>
      </div>
    </div>
  );
}
