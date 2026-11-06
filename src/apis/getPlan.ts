import { queryOptions } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { PlanSessionT } from '@/types/api';

const MAX_RETRIES = 1;

export const getPlan = async (planId: string) => {
  const { data } = await clientApi.get<PlanSessionT>(ENDPOINTS.PLAN(planId));

  return data;
};

export const planQueryOptions = (planId: string) =>
  queryOptions({
    queryKey: ['plans', planId],
    queryFn: () => getPlan(planId),
    // 404 는 서버에서 계획이 사라졌다는 뜻이라 다시 시도해도 소용없다
    retry: (failureCount, error) =>
      !(isAxiosError(error) && error.response?.status === 404) && failureCount < MAX_RETRIES,
  });
