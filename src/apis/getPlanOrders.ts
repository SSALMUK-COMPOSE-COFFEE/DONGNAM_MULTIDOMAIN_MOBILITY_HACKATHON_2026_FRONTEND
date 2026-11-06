import { queryOptions } from '@tanstack/react-query';

import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { ExecutionOrderT } from '@/types/api';

export const getPlanOrders = async (planId: string) => {
  const { data } = await clientApi.get<ExecutionOrderT[]>(ENDPOINTS.PLAN_ORDERS(planId));

  return data;
};

/** 대안을 적용할 때마다 실행 지시가 하나씩 쌓인다. 마지막 것이 지금 진행 중인 지시다 */
export const planOrdersQueryOptions = (planId: string) =>
  queryOptions({
    queryKey: ['plans', planId, 'orders'],
    queryFn: () => getPlanOrders(planId),
    staleTime: 0,
  });
