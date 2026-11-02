import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { CreatePlanRequestT, PlanSessionT } from '@/types/api';

export const postPlan = async (request: CreatePlanRequestT) => {
  const { data } = await clientApi.post<PlanSessionT>(ENDPOINTS.PLANS, request);

  return data;
};
