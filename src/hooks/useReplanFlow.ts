'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { planQueryOptions } from '@/apis/getPlan';
import { planOrdersQueryOptions } from '@/apis/getPlanOrders';
import { postPlanApply } from '@/apis/postPlanApply';
import { postPlanEvent } from '@/apis/postPlanEvent';
import type { AlternativeIdT, PlanEventT } from '@/types/api';

/**
 * 변동 → 대안 3개 → 적용 → 실행 지시 흐름.
 * 취소 재최적화와 항공 전환 재최적화가 같은 흐름을 쓴다
 */
export const useReplanFlow = (planId: string) => {
  const queryClient = useQueryClient();

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

  return {
    replanResult: replan.data ?? null,
    isReplanning: replan.isPending,
    runReplan: (event: PlanEventT) => {
      apply.reset();
      replan.mutate(event);
    },
    appliedId: apply.isSuccess ? apply.variables : null,
    applyingId: apply.isPending ? apply.variables : null,
    applyAlternative: (alternativeId: AlternativeIdT) => apply.mutate(alternativeId),
    latestOrder: orders?.at(-1) ?? null,
  };
};
