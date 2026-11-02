import { queryOptions } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { TwinStateT } from '@/types/api';

/** 손실 디지털 트윈. 아직 측정값이 없으면 404 이므로 null 로 돌려준다 */
export const getColdchainContainer = async (containerId: string) => {
  try {
    const { data } = await clientApi.get<TwinStateT>(ENDPOINTS.COLDCHAIN_CONTAINER(containerId));

    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

/** 폴링 간격은 화면이 정한다 (측정값이 바뀌는 동안만 빠르게) */
export const coldchainContainerQueryOptions = (containerId: string) =>
  queryOptions({
    queryKey: ['coldchain', 'containers', containerId],
    queryFn: () => getColdchainContainer(containerId),
    staleTime: 0,
  });
