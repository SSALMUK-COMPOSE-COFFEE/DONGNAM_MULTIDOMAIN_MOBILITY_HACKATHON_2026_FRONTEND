import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';

/** 서버 메모리의 계획 세션을 모두 지운다 (시연 처음으로) */
export const postDemoReset = async () => {
  const { data } = await clientApi.post(ENDPOINTS.DEMO_RESET);

  return data;
};
