'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { planQueryOptions } from '@/apis/getPlan';
import { postPlan } from '@/apis/postPlan';
import { ContainerCard } from '@/app/plan/_components/container-card';
import { PickupMap } from '@/app/plan/_components/pickup-map';
import { PlanSummary } from '@/app/plan/_components/plan-summary';
import { SettlementTable } from '@/app/plan/_components/settlement-table';
import { PlanLoadError } from '@/components/plan-load-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DEMO_SCENARIO_ID } from '@/consts/demo';
import { useCurrentPlan } from '@/hooks/useCurrentPlan';
import { usePlanStore } from '@/stores/usePlanStore';
import type { PlanSessionT } from '@/types/api';

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
  const queryClient = useQueryClient();
  const setPlanId = usePlanStore(state => state.setPlanId);

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => postPlan({ scenario_id: DEMO_SCENARIO_ID, use_learned_loss: false }),
    onSuccess: session => {
      queryClient.setQueryData(planQueryOptions(session.plan_id).queryKey, session);
      setPlanId(session.plan_id);
    },
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>공동적재 계획 생성</CardTitle>
        <CardDescription>
          기본 시나리오(딸기 3화주 + 포도 2화주)를 최적화해 컨테이너 배정·집하 경로·정산을 만든다
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button onClick={() => mutate()} disabled={isPending}>
          {isPending ? '최적화 중' : '계획 생성'}
        </Button>
        {isError && <p className="text-sm text-destructive">계획을 만들지 못했습니다.</p>}
      </CardContent>
    </Card>
  );
}

function PlanDetail({ session }: { session: PlanSessionT }) {
  const { plan, scenario } = session;
  const usedContainers = plan.containers.filter(container => container.used);

  return (
    <div className="flex flex-col gap-6">
      <PlanSummary plan={plan} />

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          {usedContainers.map(container => (
            <ContainerCard
              key={container.container_id}
              container={container}
              assignments={plan.assignments}
              scenario={scenario}
            />
          ))}
          <SettlementTable settlements={plan.settlements} scenario={scenario} />
        </div>

        <PickupMap scenario={scenario} voyagePickups={session.routes} />
      </div>
    </div>
  );
}
