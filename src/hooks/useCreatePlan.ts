'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { planQueryOptions } from '@/apis/getPlan';
import { postPlan } from '@/apis/postPlan';
import { DEMO_SCENARIO_ID } from '@/consts/demo';
import { usePlanStore } from '@/stores/usePlanStore';

/** 기본 시나리오로 공동적재 계획을 만들고 현재 계획으로 저장한다 */
export const useCreatePlan = () => {
  const queryClient = useQueryClient();
  const setPlanId = usePlanStore(state => state.setPlanId);

  return useMutation({
    mutationFn: () => postPlan({ scenario_id: DEMO_SCENARIO_ID, use_learned_loss: false }),
    onSuccess: session => {
      queryClient.setQueryData(planQueryOptions(session.plan_id).queryKey, session);
      setPlanId(session.plan_id);
    },
  });
};
