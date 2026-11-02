import { queryOptions } from '@tanstack/react-query';

import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { PlanSessionT } from '@/types/api';

export const getPlan = async (planId: string) => {
  const { data } = await clientApi.get<PlanSessionT>(ENDPOINTS.PLAN(planId));

  return data;
};

export const planQueryOptions = (planId: string) =>
  queryOptions({
    queryKey: ['plans', planId],
    queryFn: () => getPlan(planId),
  });
