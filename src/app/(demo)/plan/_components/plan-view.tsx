'use client';

import { PlanDetail } from '@/components/plan-detail';
import { PlanLoadError } from '@/components/plan-load-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreatePlan } from '@/hooks/useCreatePlan';
import { useCurrentPlan } from '@/hooks/useCurrentPlan';

export function PlanView() {
  const {
    planId,
    hasHydrated,
    data: session,
    isSuccess,
    isError,
    isExpired,
    refetch,
    isFetching,
  } = useCurrentPlan();

  if (!hasHydrated) return <Skeleton className="h-96" />;
  if (!planId) return <CreatePlanCard />;
  if (isError && !isExpired) {
    return <PlanLoadError onRetry={() => refetch()} isRetrying={isFetching} />;
  }
  // 404 면 useCurrentPlan 이 ID를 지우고 생성 카드로 넘어간다
  if (!isSuccess) return <Skeleton className="h-96" />;

  return <PlanDetail session={session} />;
}

function CreatePlanCard() {
  const { mutate, isPending, isError } = useCreatePlan();

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>공동적재 계획 만들기</CardTitle>
        <CardDescription>
          딸기 화주 3곳과 포도 화주 2곳의 출하로 컨테이너 배정, 집하 경로, 정산을 만듭니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button onClick={() => mutate()} disabled={isPending}>
          {isPending ? '계획 짜는 중' : '계획 만들기'}
        </Button>
        {isError && <p className="text-sm text-destructive">계획을 만들지 못했습니다.</p>}
      </CardContent>
    </Card>
  );
}
