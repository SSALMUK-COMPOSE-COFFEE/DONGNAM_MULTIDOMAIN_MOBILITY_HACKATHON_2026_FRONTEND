import { queryOptions } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { TwinStateT } from '@/types/api';

/**
 * 손실 디지털 트윈. 아직 측정값이 없으면 404 이므로 null 로 돌려준다.
 * 같은 컨테이너(CA-01)에 계획이 여럿이면 백엔드가 plan_id 없이는 422 로 거절하므로 늘 붙인다
 */
export const getColdchainContainer = async (containerId: string, planId: string) => {
  try {
    const { data } = await clientApi.get<TwinStateT>(ENDPOINTS.COLDCHAIN_CONTAINER(containerId), {
      params: { plan_id: planId },
    });

    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

/** 폴링 간격은 화면이 정한다 (측정값이 바뀌는 동안만 빠르게) */
export const coldchainContainerQueryOptions = (containerId: string, planId: string) =>
  queryOptions({
    queryKey: ['coldchain', 'containers', containerId, planId],
    queryFn: () => getColdchainContainer(containerId, planId),
    staleTime: 0,
  });
