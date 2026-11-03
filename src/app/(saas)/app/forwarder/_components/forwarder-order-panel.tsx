'use client';

import type { ReactNode } from 'react';

import { useAnswerForwarderRequest, useForwarderConfirmOptions } from '@/apis/saas/forwarder';
import { OrderCard } from '@/app/(saas)/app/forwarder/_components/order-card';
import { useConfirmOrder } from '@/hooks/useConfirmOrder';
import type { ForwarderOrderT, ForwarderPlanSessionT } from '@/types/saas-forwarder';

type ForwarderOrderPanelPropsT = {
  planId: string;
  order: ForwarderOrderT;
  session?: ForwarderPlanSessionT | null;
  heading?: ReactNode;
  showConfirm?: boolean;
};

export function useForwarderOrderActions(planId: string, orderId: string) {
  const confirmOptions = useForwarderConfirmOptions(planId, orderId);
  const confirm = useConfirmOrder(planId, orderId, confirmOptions);
  const answer = useAnswerForwarderRequest(planId, orderId);

  return {
    confirm: () => confirm.mutate({ actor: 'forwarder', accept: true }),
    isConfirming: confirm.isPending,
    answer: (requestId: string, accepted: boolean) =>
      answer.mutate({ requestId, answer: { accepted } }),
    busyRequestId: answer.isPending ? (answer.variables?.requestId ?? null) : null,
  };
}

export function ForwarderOrderPanel({
  planId,
  order,
  session = null,
  heading,
  showConfirm = true,
}: ForwarderOrderPanelPropsT) {
  const actions = useForwarderOrderActions(planId, order.order_id);

  return (
    <OrderCard
      order={order}
      session={session}
      heading={heading}
      confirm={showConfirm ? { onConfirm: actions.confirm, isPending: actions.isConfirming } : null}
      answer={actions.answer}
      busyRequestId={actions.busyRequestId}
    />
  );
}
