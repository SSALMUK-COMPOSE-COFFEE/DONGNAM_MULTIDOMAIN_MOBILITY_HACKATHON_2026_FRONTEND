'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from 'cn';
import { CheckCircle2Icon, CircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import { planQueryOptions } from '@/apis/getPlan';
import { planOrdersQueryOptions } from '@/apis/getPlanOrders';
import { postOrderConfirm } from '@/apis/postOrderConfirm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConfirmRequestT, ExecutionOrderT } from '@/types/api';
import { formatSignedManwon } from '@/utils/format';

const STATUS_LABEL: Record<ExecutionOrderT['status'], string> = {
  proposed: '화주 확인 대기',
  shipper_confirmed: '포워더 확정 대기',
  forwarder_confirmed: '확정 완료',
  executed: '실행 완료',
  rejected: '거절됨',
  expired: '기한 만료',
};

const DONE_STATUSES: ExecutionOrderT['status'][] = ['forwarder_confirmed', 'executed'];

type ExecutionOrderPanelPropsT = {
  planId: string;
  order: ExecutionOrderT;
};

/**
 * 대안을 적용하면 생기는 실행 지시.
 * 화주가 하는 일은 확정 한 번뿐이고, 나머지(배정·배차·정산)는 자동 조치로 처리된다는 걸 보여준다
 */
export function ExecutionOrderPanel({ planId, order }: ExecutionOrderPanelPropsT) {
  const queryClient = useQueryClient();
  const isDone = DONE_STATUSES.includes(order.status);

  const { mutate: confirm, isPending } = useMutation({
    mutationFn: (request: ConfirmRequestT) => postOrderConfirm(planId, order.order_id, request),
    onSuccess: (updated, { actor }) => {
      queryClient.invalidateQueries({ queryKey: planOrdersQueryOptions(planId).queryKey });
      if (actor === 'forwarder') {
        queryClient.invalidateQueries({ queryKey: planQueryOptions(planId).queryKey });
        toast.success(`계획 v${updated.target_version} 확정. 자동 조치를 실행했습니다.`);
      }
    },
    onError: () => toast.error('확정하지 못했습니다.'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          실행 지시
          <Badge variant={isDone ? 'default' : 'secondary'} className={cn(isDone && 'bg-ok')}>
            {STATUS_LABEL[order.status]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-8">
        <section className="flex flex-col gap-3">
          <h3 className="font-bold">자동 조치</h3>
          <ul className="flex flex-col gap-2.5 text-sm">
            {order.automatic.map(({ kind, description, done }) => (
              <li key={`${kind}-${description}`} className="flex gap-2">
                {done ? (
                  <CheckCircle2Icon className="size-4 shrink-0 translate-y-0.5 text-ok" />
                ) : (
                  <CircleIcon className="size-4 shrink-0 translate-y-0.5 text-line" />
                )}
                {description}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-bold">화주 확인</h3>
          {order.shipper_confirmations.length === 0 && (
            <p className="text-sm text-muted-foreground">비용·일정이 바뀌는 화주가 없습니다.</p>
          )}
          {order.shipper_confirmations.map(
            ({ shipper_id, shipper_name, reason_text, net_cost_delta, cost_delta, status }) => (
              <div key={shipper_id} className="flex items-center gap-3 rounded-xl border p-3">
                <div className="flex-1 text-sm">
                  <p className="font-bold">{shipper_name}</p>
                  <p className="text-muted-foreground">{reason_text?.join(' · ')}</p>
                  <p className="num">
                    부담 {formatSignedManwon(net_cost_delta ?? cost_delta)}만 원
                  </p>
                </div>
                {status === 'pending' ? (
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      confirm({ actor: 'shipper', shipper_id: shipper_id, accept: true })
                    }
                  >
                    수락
                  </Button>
                ) : (
                  <Badge variant="secondary">{status === 'accepted' ? '수락함' : '거절함'}</Badge>
                )}
              </div>
            )
          )}
          <Button
            size="lg"
            disabled={isPending || order.status !== 'shipper_confirmed'}
            onClick={() => confirm({ actor: 'forwarder', accept: true })}
          >
            {isDone ? '포워더 확정 완료' : '포워더 확정'}
          </Button>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="font-bold">포워더가 보낼 요청</h3>
          <ul className="flex flex-col gap-2.5 text-sm">
            {order.requests.map(({ request_id, counterparty, text }) => (
              <li key={request_id} className="rounded-xl bg-panel p-3">
                <p className="font-bold text-navy">{counterparty}</p>
                <p className="text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}
