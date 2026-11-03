'use client';

import type { ReactNode } from 'react';

import { PlanLoadError } from '@/components/plan-load-error';
import { PlanRequired } from '@/components/plan-required';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentPlan } from '@/hooks/useCurrentPlan';
import type { PlanSessionT } from '@/types/api';

type CurrentPlanGatePropsT = {
  /** 계획이 없을 때 안내 문구 */
  reason: string;
  emptyFallback?: ReactNode;
  children: (session: PlanSessionT) => ReactNode;
};

/** 저장된 계획을 불러온 뒤에만 화면을 그린다 (로딩·계획 없음·네트워크 오류 처리) */
export function CurrentPlanGate({ reason, emptyFallback, children }: CurrentPlanGatePropsT) {
  const { planId, hasHydrated, data, isSuccess, isError, isExpired, refetch, isFetching } =
    useCurrentPlan();

  if (!hasHydrated) return <Skeleton className="h-96" />;
  if (!planId) return emptyFallback ?? <PlanRequired reason={reason} />;
  if (isError && !isExpired) {
    return <PlanLoadError onRetry={() => refetch()} isRetrying={isFetching} />;
  }
  // 404 면 useCurrentPlan 이 ID를 지우고 '계획 없음'으로 넘어간다
  if (!isSuccess) return <Skeleton className="h-96" />;

  return children(data);
}
