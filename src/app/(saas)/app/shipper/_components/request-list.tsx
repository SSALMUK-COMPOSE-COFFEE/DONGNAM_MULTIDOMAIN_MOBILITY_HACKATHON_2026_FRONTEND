'use client';

import { cn } from 'cn';
import { toast } from 'sonner';

import { useAnswerShipperRequest } from '@/apis/saas/shipper';
import { formatKstMonthDayTime } from '@/app/(saas)/app/shipper/_components/kst';
import {
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LABEL,
} from '@/app/(saas)/app/shipper/_components/labels';
import { errorDetail } from '@/app/(saas)/app/shipper/_components/query-state';
import {
  isRequestAnswerable,
  isRequestAwaitingForwarder,
} from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ShipperOrderT, ShipperRequestT } from '@/types/saas-shipper';

export type RequestItemT = {
  planId: string;
  order: ShipperOrderT;
  request: ShipperRequestT;
};

const requestStatusLabel = (request: ShipperRequestT) =>
  request.status === 'pending' ? '마감' : REQUEST_STATUS_LABEL[request.status];

export function RequestList({ items, emptyText }: { items: RequestItemT[]; emptyText: string }) {
  const answer = useAnswerShipperRequest();

  if (items.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;

  const respond = ({ planId, order, request }: RequestItemT, accepted: boolean) =>
    answer.mutate(
      { planId, orderId: order.order_id, requestId: request.request_id, answer: { accepted } },
      {
        onSuccess: () => toast.success(accepted ? '요청을 수락했습니다.' : '요청을 거절했습니다.'),
        onError: error => toast.error(errorDetail(error, '요청에 응답하지 못했습니다.')),
      }
    );

  return (
    <ul className="flex flex-col gap-3">
      {items.map(item => {
        const { order, request } = item;
        const canAnswer = isRequestAnswerable(order, request);
        const statusLabel = isRequestAwaitingForwarder(order, request)
          ? '포워더 확정 대기'
          : requestStatusLabel(request);
        const isBusy = answer.isPending && answer.variables?.requestId === request.request_id;

        return (
          <li
            key={`${order.order_id}:${request.request_id}`}
            className={cn(
              'flex items-start gap-4 rounded-xl border p-4',
              canAnswer && 'border-brand bg-brand-soft/40'
            )}
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{REQUEST_KIND_LABEL[request.kind]}</Badge>
                <span className="font-bold text-navy">{request.counterparty}</span>
                <span className="text-sm text-muted-foreground">{request.channel}</span>
              </div>
              <p>{request.text}</p>
              <p className="flex flex-wrap gap-x-6 text-sm text-muted-foreground">
                <span>
                  기한{' '}
                  <span className="num text-foreground">
                    {formatKstMonthDayTime(request.deadline)}
                  </span>
                </span>
                {request.container_id && <span className="num">{request.container_id}</span>}
                {request.pallets_before !== request.pallets_after && (
                  <span className="num">
                    {request.pallets_before} → {request.pallets_after}파렛트
                  </span>
                )}
                {request.note && <span>메모 {request.note}</span>}
              </p>
            </div>
            {canAnswer ? (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" disabled={isBusy} onClick={() => respond(item, true)}>
                  수락
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isBusy}
                  onClick={() => respond(item, false)}
                >
                  거절
                </Button>
              </div>
            ) : (
              <Badge
                variant="secondary"
                className={cn(request.status === 'accepted' && 'bg-ok-soft text-ok')}
              >
                {statusLabel}
              </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}
