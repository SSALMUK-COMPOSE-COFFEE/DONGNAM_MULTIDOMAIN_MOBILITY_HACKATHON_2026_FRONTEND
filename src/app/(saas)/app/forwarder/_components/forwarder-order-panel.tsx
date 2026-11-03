'use client';

import { useAnswerForwarderRequest, useForwarderConfirmOptions } from '@/apis/saas/forwarder';
import { ExecutionOrderPanel } from '@/components/execution-order';
import type { ForwarderOrderT } from '@/types/saas-forwarder';

type ForwarderOrderPanelPropsT = {
  planId: string;
  order: ForwarderOrderT;
};

export function ForwarderOrderPanel({ planId, order }: ForwarderOrderPanelPropsT) {
  const confirmOptions = useForwarderConfirmOptions(planId, order.order_id);
  const answer = useAnswerForwarderRequest(planId, order.order_id);

  return (
    <ExecutionOrderPanel
      planId={planId}
      order={order}
      role="forwarder"
      confirmOptions={confirmOptions}
      requestAnswer={{
        answer: (requestId, accepted) => answer.mutate({ requestId, answer: { accepted } }),
        busyRequestId: answer.isPending ? (answer.variables?.requestId ?? null) : null,
      }}
    />
  );
}
