'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from 'cn';
import { useId, useState } from 'react';
import { toast } from 'sonner';

import { toastSaasError } from '@/apis/saas/errors';
import {
  postShipperOrderConfirm,
  shipperKeys,
  useInvalidateShipperPlan,
  useShipperOrgId,
} from '@/apis/saas/shipper';
import type { ShipperOrderT } from '@/types/saas-shipper';

export type PendingConfirmationT = {
  order: ShipperOrderT;
  confirmation: ShipperOrderT['shipper_confirmations'][number];
};

type DecisionT = { accept: boolean; note: string | null };

const REASON_MAX = 300;

const REJECTED_MESSAGE = '계획을 거절했습니다. 포워더가 계획을 다시 검토합니다.';

const latestPerOrder = (responses: ShipperOrderT[]) => [
  ...new Map(responses.map(order => [order.order_id, order])).values(),
];

const acceptedMessage = (responses: ShipperOrderT[]) => {
  const orders = latestPerOrder(responses);

  if (orders.some(({ status }) => status === 'proposed')) {
    return '수락했습니다. 다른 화주 확정을 기다립니다.';
  }
  if (orders.some(({ status }) => status === 'shipper_confirmed')) {
    return '수락했습니다. 포워더 확정을 기다립니다.';
  }

  return '계획을 확정했습니다.';
};

export const useOrderDecision = (planId: string, items: PendingConfirmationT[]) => {
  const orgId = useShipperOrgId();
  const queryClient = useQueryClient();
  const invalidatePlan = useInvalidateShipperPlan();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: async ({ accept, note }: DecisionT) => {
      const responses: ShipperOrderT[] = [];
      for (const { order, confirmation } of items) {
        responses.push(
          await postShipperOrderConfirm(planId, order.order_id, {
            accept,
            note,
            shipper_id: confirmation.shipper_id,
          })
        );
      }

      return responses;
    },
    onSuccess: (orders, { accept }) => {
      setRejecting(false);
      setReason('');
      toast.success(accept ? acceptedMessage(orders) : REJECTED_MESSAGE);
    },
    onSettled: () => {
      invalidatePlan(planId);
      queryClient.invalidateQueries({ queryKey: shipperKeys.lots(orgId) });
    },
    onError: (error, { accept }) =>
      toastSaasError(accept ? '계획을 확정하지 못했습니다.' : '거절을 보내지 못했습니다.')(error),
  });

  return {
    items,
    rejecting,
    reason,
    isPending: mutation.isPending,
    pendingAccept: mutation.isPending ? (mutation.variables?.accept ?? null) : null,
    accept: () => mutation.mutate({ accept: true, note: null }),
    reject: () => {
      const note = reason.trim();
      if (!note) return;
      mutation.mutate({ accept: false, note });
    },
    openReject: () => setRejecting(true),
    closeReject: () => {
      setRejecting(false);
      setReason('');
    },
    setReason: (value: string) => setReason(value.slice(0, REASON_MAX)),
  };
};

export type OrderDecisionT = ReturnType<typeof useOrderDecision>;

export function DecisionButtons({
  decision,
  acceptLabel = '계획 확정하기',
  className,
}: {
  decision: OrderDecisionT;
  acceptLabel?: string;
  className?: string;
}) {
  if (decision.items.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <button
        type="button"
        className="m2-btn m2-btn-sec"
        disabled={decision.isPending}
        aria-expanded={decision.rejecting}
        onClick={decision.rejecting ? decision.closeReject : decision.openReject}
      >
        거절
      </button>
      <button
        type="button"
        className="m2-btn m2-btn-pri"
        disabled={decision.isPending}
        onClick={decision.accept}
      >
        {decision.pendingAccept === true ? '확정 중' : acceptLabel}
      </button>
    </div>
  );
}

export function RejectForm({ decision }: { decision: OrderDecisionT }) {
  const inputId = useId();

  if (!decision.rejecting || decision.items.length === 0) return null;

  const empty = decision.reason.trim() === '';

  return (
    <form
      className="m2-block mt-3 flex flex-col gap-2"
      onSubmit={event => {
        event.preventDefault();
        decision.reject();
      }}
    >
      <label htmlFor={inputId} className="text-[13px] font-semibold">
        거절 사유
      </label>
      <textarea
        id={inputId}
        className="m2-inp h-auto min-h-[72px] w-full resize-y py-2.5 text-[13.5px]"
        placeholder="예: 그날 출하 장소 작업이 어려워요"
        value={decision.reason}
        onChange={event => decision.setReason(event.target.value)}
        disabled={decision.isPending}
        required
      />
      <p className="m2-sub mt-0 text-[12px]">
        거절하면 이번 변경은 반영되지 않고 포워더가 사유를 확인하고 계획을 다시 검토합니다.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="m2-btn m2-btn-sec m2-btn-sm"
          disabled={decision.isPending}
          onClick={decision.closeReject}
        >
          닫기
        </button>
        <button
          type="submit"
          className="m2-btn m2-btn-sm bg-m2-berry-soft text-m2-berry-ink"
          disabled={decision.isPending || empty}
        >
          {decision.pendingAccept === false ? '보내는 중' : '거절 보내기'}
        </button>
      </div>
    </form>
  );
}
