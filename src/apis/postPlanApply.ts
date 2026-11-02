import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { AlternativeIdT, PlanSessionT } from '@/types/api';

/** 고른 대안을 계획에 반영한다. 계획은 화주·포워더 확정 대기(pending_confirmation)가 된다 */
export const postPlanApply = async (
  planId: string,
  { alternativeId, replanId }: { alternativeId: AlternativeIdT; replanId: string }
) => {
  const { data } = await clientApi.post<PlanSessionT>(ENDPOINTS.PLAN_APPLY(planId), {
    alternative_id: alternativeId,
    replan_id: replanId,
  });

  return data;
};
