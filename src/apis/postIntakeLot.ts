import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { IntakePreviewT, IntakeRequestT } from '@/types/api';

/** 출하 5개 항목을 넣으면 판매기한·로트 ID를 채우고 실을 수 있는 배·항공 여부를 알려준다 (미리보기) */
export const postIntakeLot = async (request: IntakeRequestT) => {
  const { data } = await clientApi.post<IntakePreviewT>(ENDPOINTS.INTAKE_LOTS, request);

  return data;
};
