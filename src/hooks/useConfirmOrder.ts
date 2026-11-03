'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { planQueryOptions } from '@/apis/getPlan';
import { planOrdersQueryOptions } from '@/apis/getPlanOrders';
import { postOrderConfirm } from '@/apis/postOrderConfirm';
import type { ConfirmRequestT, ExecutionOrderT } from '@/types/api';

export type ConfirmActorT = ConfirmRequestT['actor'];

export type ConfirmOrderRequestT = Omit<ConfirmRequestT, 'actor' | 'shipper_id'> & {
  actor?: ConfirmActorT;
  shipper_id?: string | null;
};

export type UseConfirmOrderOptionsT = {
  confirmFn?: (request: ConfirmOrderRequestT) => Promise<ExecutionOrderT>;
  onSuccess?: (updated: ExecutionOrderT, request: ConfirmOrderRequestT) => void;
};

export const useConfirmOrder = (
  planId: string,
  orderId: string,
  { confirmFn, onSuccess }: UseConfirmOrderOptionsT = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ConfirmOrderRequestT) => {
      if (confirmFn) return confirmFn(request);
      const { actor } = request;
      if (!actor) return Promise.reject(new Error('actor is required'));

      return postOrderConfirm(planId, orderId, { ...request, actor });
    },
    onSuccess: (updated, request) => {
      if (onSuccess) {
        onSuccess(updated, request);

        return;
      }
      queryClient.invalidateQueries({ queryKey: planOrdersQueryOptions(planId).queryKey });
      if (request.actor === 'forwarder') {
        queryClient.invalidateQueries({ queryKey: planQueryOptions(planId).queryKey });
        toast.success('계획을 확정하고 자동 조치를 실행했습니다.');
      }
    },
    onError: () => toast.error('확정하지 못했습니다.'),
  });
};
