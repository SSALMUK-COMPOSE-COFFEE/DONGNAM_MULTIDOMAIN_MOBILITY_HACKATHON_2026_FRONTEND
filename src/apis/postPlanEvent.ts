import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { PlanEventT, ReplanResponseT } from '@/types/api';

/**
 * 취소·감축·항공 전환 같은 변동을 보내 재최적화 대안 3개를 받는다 (미리보기, 계획은 안 바뀐다).
 * 시연에서는 LLM 없이 템플릿 설명문을 쓴다 (네트워크·응답 시간 변동 방지)
 */
export const postPlanEvent = async (planId: string, event: PlanEventT) => {
  const { data } = await clientApi.post<ReplanResponseT>(
    ENDPOINTS.PLAN_EVENTS(planId),
    { event },
    { params: { llm: false } }
  );

  return data;
};
