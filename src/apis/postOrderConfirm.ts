import { clientApi } from '@/apis/client';
import { ENDPOINTS } from '@/consts/api';
import type { ConfirmRequestT, ExecutionOrderT } from '@/types/api';

/** 화주 수락 또는 포워더 확정. 포워더가 확정하면 계획이 committed 가 된다 */
export const postOrderConfirm = async (
  planId: string,
  orderId: string,
  request: ConfirmRequestT
) => {
  const { data } = await clientApi.post<ExecutionOrderT>(
    ENDPOINTS.PLAN_ORDER_CONFIRM(planId, orderId),
    request
  );

  return data;
};
