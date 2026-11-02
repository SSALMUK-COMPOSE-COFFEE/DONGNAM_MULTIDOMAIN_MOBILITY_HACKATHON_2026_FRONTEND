'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { ContainerLoadBar } from '@/components/container-load-bar';
import { CurrentPlanGate } from '@/components/current-plan-gate';
import { ExecutionOrderPanel } from '@/components/execution-order';
import { ReplanAlternatives } from '@/components/replan-alternatives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEMO_REDUCE_LOT_ID, DEMO_REDUCE_TO_PALLETS } from '@/consts/demo';
import { useReplanFlow } from '@/hooks/useReplanFlow';
import type { PlanSessionT } from '@/types/api';
import { getProductName, getShipperShortName } from '@/utils/scenario';

export function ReplanView() {
  return (
    <CurrentPlanGate reason="취소가 생길 계획이 있어야 다시 짤 수 있습니다.">
      {session => <ReplanWorkspace session={session} />}
    </CurrentPlanGate>
  );
}

function ReplanWorkspace({ session }: { session: PlanSessionT }) {
  const { plan_id: planId, plan, scenario } = session;

  // 해상으로 가는 로트만 취소·감축 대상이다
  const seaLots = plan.assignments.filter(
    ({ mode, container_id }) => mode === 'sea' && container_id
  );
  const [lotId, setLotId] = useState(
    seaLots.some(({ lot_id }) => lot_id === DEMO_REDUCE_LOT_ID)
      ? DEMO_REDUCE_LOT_ID
      : (seaLots[0]?.lot_id ?? '')
  );
  const lot = seaLots.find(({ lot_id }) => lot_id === lotId);
  const [newPallets, setNewPallets] = useState(DEMO_REDUCE_TO_PALLETS);
  const clampedPallets = Math.min(newPallets, (lot?.pallets ?? 1) - 1);
  const container = plan.containers.find(({ container_id }) => container_id === lot?.container_id);

  const flow = useReplanFlow(planId);

  const runReplan = () => {
    if (!lot) return;
    flow.runReplan(
      clampedPallets === 0
        ? { type: 'cancel', lot_id: lot.lot_id }
        : { type: 'reduce', lot_id: lot.lot_id, new_pallets: clampedPallets }
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[440px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>변동 입력</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Select value={lotId} onValueChange={setLotId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="로트 선택" />
              </SelectTrigger>
              <SelectContent>
                {seaLots.map(({ lot_id, shipper_id, product_id, pallets, container_id }) => (
                  <SelectItem key={lot_id} value={lot_id}>
                    {getShipperShortName(scenario, shipper_id)}{' '}
                    {getProductName(scenario, product_id)} {pallets}파렛트 · {container_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                <span className="num">{lot?.pallets}</span> →
              </span>
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="한 파렛트 줄이기"
                  disabled={clampedPallets <= 0}
                  onClick={() => setNewPallets(clampedPallets - 1)}
                >
                  <MinusIcon />
                </Button>
                <span className="w-10 text-center text-3xl font-bold num">{clampedPallets}</span>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="한 파렛트 늘리기"
                  disabled={clampedPallets >= (lot?.pallets ?? 1) - 1}
                  onClick={() => setNewPallets(clampedPallets + 1)}
                >
                  <PlusIcon />
                </Button>
                <span className="text-muted-foreground">파렛트</span>
              </div>
            </div>

            <Button size="lg" disabled={!lot || flow.isReplanning} onClick={runReplan}>
              {flow.isReplanning
                ? '다시 짜는 중'
                : `${lot ? getShipperShortName(scenario, lot.shipper_id) : ''} ${
                    clampedPallets === 0
                      ? '전량 취소'
                      : `${(lot?.pallets ?? 0) - clampedPallets}파렛트 취소`
                  } → 재최적화`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              지금 계획
              {session.status === 'pending_confirmation' && (
                <Badge className="bg-air">확정 대기</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {container && (
              <ContainerLoadBar container={container} plan={plan} scenario={scenario} />
            )}
          </CardContent>
        </Card>
      </div>

      {flow.replanResult && (
        <ReplanAlternatives
          replan={flow.replanResult}
          scenario={scenario}
          focusContainerId={container?.container_id ?? null}
          appliedId={flow.appliedId}
          applyingId={flow.applyingId}
          onApply={flow.applyAlternative}
        />
      )}

      {flow.latestOrder && <ExecutionOrderPanel planId={planId} order={flow.latestOrder} />}
    </div>
  );
}
