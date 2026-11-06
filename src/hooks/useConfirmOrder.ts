'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { ConfirmRequestT, ExecutionOrderT } from '@/types/api';
import type { ForwarderOrderT } from '@/types/saas-forwarder';

export type ConfirmActorT = ConfirmRequestT['actor'];

export type ConfirmOrderRequestT = Omit<ConfirmRequestT, 'actor' | 'shipper_id'> & {
  actor?: ConfirmActorT;
  shipper_id?: string | null;
};

export type ConfirmableOrderT = ExecutionOrderT | ForwarderOrderT;

export type UseConfirmOrderOptionsT = {
  confirmFn: (request: ConfirmOrderRequestT) => Promise<ConfirmableOrderT>;
  onSuccess?: (updated: ConfirmableOrderT, request: ConfirmOrderRequestT) => void;
  onError?: (error: unknown) => void;
};

export const useConfirmOrder = ({ confirmFn, onSuccess, onError }: UseConfirmOrderOptionsT) =>
  useMutation({
    mutationFn: (request: ConfirmOrderRequestT) => confirmFn(request),
    onSuccess,
    onError: onError ?? (() => toast.error('확정하지 못했습니다.')),
  });
