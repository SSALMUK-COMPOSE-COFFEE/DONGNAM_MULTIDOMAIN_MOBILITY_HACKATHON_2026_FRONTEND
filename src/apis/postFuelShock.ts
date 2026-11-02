import { queryOptions } from '@tanstack/react-query';

import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { FuelShockRequestT, FuelShockResultT } from '@/types/api';

/** 할증료마다 계획을 다시 풀어 배정·절감 변화와 배정이 바뀌는 할증료(임계값)를 돌려준다 */
export const postFuelShock = async (request: Partial<FuelShockRequestT>) => {
  const { data } = await clientApi.post<FuelShockResultT>(ENDPOINTS.ANALYSIS_FUEL_SHOCK, request);

  return data;
};

/** 같은 입력이면 결과가 같으므로 조회처럼 캐시한다 (재계산 약 0.6초) */
export const fuelShockQueryOptions = (request: Partial<FuelShockRequestT>) =>
  queryOptions({
    queryKey: ['analysis', 'fuel-shock', request],
    queryFn: () => postFuelShock(request),
    staleTime: Infinity,
  });
