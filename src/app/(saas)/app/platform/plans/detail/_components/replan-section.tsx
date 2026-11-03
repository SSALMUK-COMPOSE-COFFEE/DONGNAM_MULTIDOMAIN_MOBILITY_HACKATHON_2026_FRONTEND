'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { usePlatformReplanFlow } from '@/apis/saas/platform';
import { ContainerLoadBar } from '@/components/container-load-bar';
import { ExecutionOrderPanel } from '@/components/execution-order';
import { ReplanAlternatives } from '@/components/replan-alternatives';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PlanEventT, PlanSessionT } from '@/types/api';
import { getProductName, getShipperShortName } from '@/utils/scenario';

type ChangeKindT = 'reduce' | 'air_switch';

export function ReplanSection({ session }: { session: PlanSessionT }) {
  const { plan_id: planId, plan, scenario } = session;
  const seaLots = plan.assignments.filter(
    ({ mode, container_id }) => mode === 'sea' && container_id
  );
  const [kind, setKind] = useState<ChangeKindT>('reduce');
  const [pickedLotId, setPickedLotId] = useState('');
  const lot = seaLots.find(({ lot_id }) => lot_id === pickedLotId) ?? seaLots[0];
  const [newPallets, setNewPallets] = useState(0);
  const maxPallets = Math.max((lot?.pallets ?? 1) - 1, 0);
  const pallets = Math.min(newPallets, maxPallets);
  const container = plan.containers.find(({ container_id }) => container_id === lot?.container_id);

  const flow = usePlatformReplanFlow(planId);

  const buildEvent = (): PlanEventT | null => {
    if (!lot) return null;
    if (kind === 'air_switch') return { type: 'air_switch', lot_id: lot.lot_id };

    return pallets === 0
      ? { type: 'cancel', lot_id: lot.lot_id }
      : { type: 'reduce', lot_id: lot.lot_id, new_pallets: pallets };
  };

  const runReplan = () => {
    const event = buildEvent();
    if (event) flow.runReplan(event);
  };

  const shipperName = lot ? getShipperShortName(scenario, lot.shipper_id) : '';
  const actionLabel =
    kind === 'air_switch'
      ? `${shipperName} 항공으로 돌리고 다시 짜기`
      : `${shipperName} ${pallets === 0 ? '전량' : `${(lot?.pallets ?? 0) - pallets}파렛트`} 취소하고 다시 짜기`;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>재최적화</CardTitle>
          <CardDescription>
            화주 취소·감축이나 항공 전환이 생기면 세 가지 안을 다시 계산해 고릅니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-[400px_1fr] items-start gap-10">
          {seaLots.length === 0 ? (
            <p className="text-muted-foreground">해상으로 가는 로트가 없어 바꿀 대상이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-5">
              <Tabs value={kind} onValueChange={value => setKind(value as ChangeKindT)}>
                <TabsList>
                  <TabsTrigger value="reduce">취소 · 감축</TabsTrigger>
                  <TabsTrigger value="air_switch">항공 전환</TabsTrigger>
                </TabsList>
              </Tabs>

              <Select value={lot?.lot_id ?? ''} onValueChange={setPickedLotId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="로트 선택" />
                </SelectTrigger>
                <SelectContent>
                  {seaLots.map(
                    ({ lot_id, shipper_id, product_id, pallets: lotPallets, container_id }) => (
                      <SelectItem key={lot_id} value={lot_id}>
                        {getShipperShortName(scenario, shipper_id)}{' '}
                        {getProductName(scenario, product_id)} {lotPallets}파렛트 · {container_id}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              {kind === 'reduce' && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    <span className="num">{lot?.pallets}</span> →
                  </span>
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="한 파렛트 줄이기"
                      disabled={pallets <= 0}
                      onClick={() => setNewPallets(pallets - 1)}
                    >
                      <MinusIcon />
                    </Button>
                    <span className="w-10 text-center text-3xl font-bold num">{pallets}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      aria-label="한 파렛트 늘리기"
                      disabled={pallets >= maxPallets}
                      onClick={() => setNewPallets(pallets + 1)}
                    >
                      <PlusIcon />
                    </Button>
                    <span className="text-muted-foreground">파렛트</span>
                  </div>
                </div>
              )}

              <Button size="lg" disabled={!lot || flow.isReplanning} onClick={runReplan}>
                {flow.isReplanning ? '다시 짜는 중' : actionLabel}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-5 border-l border-line pl-10">
            <h3 className="text-xl font-bold">지금 계획</h3>
            {container ? (
              <ContainerLoadBar container={container} plan={plan} scenario={scenario} />
            ) : (
              <p className="text-muted-foreground">로트를 고르면 실린 컨테이너를 보여줍니다.</p>
            )}
          </div>
        </CardContent>
      </Card>

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

      {flow.latestOrder && (
        <ExecutionOrderPanel planId={planId} order={flow.latestOrder} role="platform" />
      )}
    </div>
  );
}
