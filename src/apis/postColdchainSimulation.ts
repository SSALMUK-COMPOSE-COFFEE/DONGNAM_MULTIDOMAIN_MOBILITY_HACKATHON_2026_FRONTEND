import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { BindingRequestT, SimulationRequestT, SimulationRunT } from '@/types/api';

/** 아두이노(또는 시뮬레이터) 장치를 계획의 컨테이너에 연결한다 */
export const postColdchainBinding = async (request: BindingRequestT) => {
  await clientApi.post(ENDPOINTS.COLDCHAIN_BINDINGS, request);
};

/** 실물 센서 대신 같은 수집 경로로 측정값을 재생한다 */
export const postColdchainSimulation = async (request: SimulationRequestT) => {
  const { data } = await clientApi.post<SimulationRunT>(ENDPOINTS.COLDCHAIN_SIMULATE, request);

  return data;
};
