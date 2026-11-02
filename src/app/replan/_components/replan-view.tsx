'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { planQueryOptions } from '@/apis/getPlan';
import { planOrdersQueryOptions } from '@/apis/getPlanOrders';
import { postPlanApply } from '@/apis/postPlanApply';
import { postPlanEvent } from '@/apis/postPlanEvent';
import { ContainerLoadBar } from '@/components/container-load-bar';
import { ExecutionOrderPanel } from '@/components/execution-order';
import { PlanLoadError } from '@/components/plan-load-error';
import { PlanRequired } from '@/components/plan-required';
import { ReplanAlternatives } from '@/components/replan-alternatives';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DEMO_REDUCE_LOT_ID, DEMO_REDUCE_TO_PALLETS } from '@/consts/demo';
import { useCurrentPlan } from '@/hooks/useCurrentPlan';
import type { AlternativeIdT, PlanEventT, PlanSessionT } from '@/types/api';
import { getProductName, getShipperShortName } from '@/utils/scenario';

export function ReplanView() {
  const { planId, hasHydrated, data, isSuccess, isError, isExpired, refetch, isFetching } =
    useCurrentPlan();

  if (!hasHydrated) return <Skeleton className="h-96" />;
  if (!planId) return <PlanRequired reason="취소가 생길 계획이 있어야 다시 짤 수 있습니다." />;
  if (isError && !isExpired) {
    return <PlanLoadError onRetry={() => refetch()} isRetrying={isFetching} />;
  }
  if (!isSuccess) return <Skeleton className="h-96" />;

  return <ReplanWorkspace session={data} />;
}

function ReplanWorkspace({ session }: { session: PlanSessionT }) {
  const queryClient = useQueryClient();
  const { plan_id: planId, plan, scenario } = session;

  // 해상으로 가는 로트만 취소·감축 대상이다
  const seaLots = plan.assignments.filter(
    ({ mode, container_id }) => mode === 'sea' && container_id
  );
  const [lotId, setLotId] = useState(
    seaLots.some(({ lot_id }) => lot_id === DEMO_REDUCE_LOT_ID)
      ? DEMO_REDUCE_LOT_ID
      : (seaLots[0]?.lot_id ?? '')
  );
  const lot = seaLots.find(({ lot_id }) => lot_id === lotId);
  const [newPallets, setNewPallets] = useState(DEMO_REDUCE_TO_PALLETS);
  const clampedPallets = Math.min(newPallets, (lot?.pallets ?? 1) - 1);
  const container = plan.containers.find(({ container_id }) => container_id === lot?.container_id);

  const replan = useMutation({
    mutationFn: (event: PlanEventT) => postPlanEvent(planId, event),
    onError: () => toast.error('재최적화하지 못했습니다.'),
  });

  const apply = useMutation({
    mutationFn: (alternativeId: AlternativeIdT) =>
      postPlanApply(planId, { alternativeId, replanId: replan.data?.replan_id ?? '' }),
    onSuccess: updated => {
      queryClient.setQueryData(planQueryOptions(planId).queryKey, updated);
      queryClient.invalidateQueries({ queryKey: planOrdersQueryOptions(planId).queryKey });
      toast.success('대안을 적용했습니다. 화주·포워더 확정을 기다립니다.');
    },
    onError: () => toast.error('대안을 적용하지 못했습니다.'),
  });

  const { data: orders } = useQuery(planOrdersQueryOptions(planId));
  const latestOrder = orders?.at(-1);

  const runReplan = () => {
    if (!lot) return;
    apply.reset();
    replan.mutate(
      clampedPallets === 0
        ? { type: 'cancel', lot_id: lot.lot_id }
        : { type: 'reduce', lot_id: lot.lot_id, new_pallets: clampedPallets }
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[440px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>변동 입력</CardTitle>
            <CardDescription>화주가 출하량을 줄이거나 취소했다</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Select value={lotId} onValueChange={setLotId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="로트 선택" />
              </SelectTrigger>
              <SelectContent>
                {seaLots.map(({ lot_id, shipper_id, product_id, pallets, container_id }) => (
                  <SelectItem key={lot_id} value={lot_id}>
                    {getShipperShortName(scenario, shipper_id)}{' '}
                    {getProductName(scenario, product_id)} {pallets}파렛트 · {container_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                <span className="num">{lot?.pallets}</span> →
              </span>
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="한 파렛트 줄이기"
                  disabled={clampedPallets <= 0}
                  onClick={() => setNewPallets(clampedPallets - 1)}
                >
                  <MinusIcon />
                </Button>
                <span className="w-10 text-center text-3xl font-bold num">{clampedPallets}</span>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="한 파렛트 늘리기"
                  disabled={clampedPallets >= (lot?.pallets ?? 1) - 1}
                  onClick={() => setNewPallets(clampedPallets + 1)}
                >
                  <PlusIcon />
                </Button>
                <span className="text-muted-foreground">파렛트</span>
              </div>
            </div>

            <Button size="lg" disabled={!lot || replan.isPending} onClick={runReplan}>
              {replan.isPending
                ? '다시 짜는 중'
                : `${lot ? getShipperShortName(scenario, lot.shipper_id) : ''} ${
                    clampedPallets === 0
                      ? '전량 취소'
                      : `${(lot?.pallets ?? 0) - clampedPallets}파렛트 취소`
                  } → 재최적화`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>지금 계획</CardTitle>
            <CardDescription>
              v{session.version}
              {session.status === 'pending_confirmation' && ' · 확정 대기'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {container && (
              <ContainerLoadBar container={container} plan={plan} scenario={scenario} />
            )}
          </CardContent>
        </Card>
      </div>

      {replan.data && (
        <ReplanAlternatives
          replan={replan.data}
          scenario={scenario}
          focusContainerId={
            container?.container_id ?? replan.data.diff?.containers[0]?.container_id ?? null
          }
          appliedId={apply.isSuccess ? apply.variables : null}
          applyingId={apply.isPending ? apply.variables : null}
          onApply={alternativeId => apply.mutate(alternativeId)}
        />
      )}

      {latestOrder && <ExecutionOrderPanel planId={planId} order={latestOrder} />}
    </div>
  );
}
