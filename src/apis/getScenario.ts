import { queryOptions } from '@tanstack/react-query';

import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { ScenarioT } from '@/types/api';

export const getScenario = async (scenarioId: string) => {
  const { data } = await clientApi.get<ScenarioT>(ENDPOINTS.SCENARIO(scenarioId));

  return data;
};

/** 시나리오(화주·품목·항구·등록된 출하)는 시연 중에 바뀌지 않는다 */
export const scenarioQueryOptions = (scenarioId: string) =>
  queryOptions({
    queryKey: ['scenarios', scenarioId],
    queryFn: () => getScenario(scenarioId),
    staleTime: Infinity,
  });
