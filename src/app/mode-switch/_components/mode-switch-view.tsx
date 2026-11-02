'use client';

import { useState } from 'react';

import { ContainerLoadBar } from '@/components/container-load-bar';
import { CostCompare } from '@/components/cost-compare';
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
import { DEMO_AIR_SWITCH_LOT_ID } from '@/consts/demo';
import { useReplanFlow } from '@/hooks/useReplanFlow';
import type { PlanSessionT } from '@/types/api';
import { formatManwon } from '@/utils/format';
import { getProductName, getShipperShortName } from '@/utils/scenario';

export function ModeSwitchView() {
  return (
    <CurrentPlanGate reason="해상으로 가는 화물이 있어야 항공 전환을 비교할 수 있습니다.">
      {session => <ModeSwitchWorkspace session={session} />}
    </CurrentPlanGate>
  );
}

function ModeSwitchWorkspace({ session }: { session: PlanSessionT }) {
  const { plan_id: planId, plan, scenario } = session;
  const flow = useReplanFlow(planId);

  // 정산표(항공·해상 단가)가 있는 품목의 해상 로트만 항공 전환 비교 대상이다
  const tariffs = plan.settlement_tariffs ?? [];
  const seaLots = plan.assignments.filter(
    ({ mode, container_id, product_id }) =>
      mode === 'sea' && container_id && tariffs.some(tariff => tariff.product_id === product_id)
  );
  const [lotId, setLotId] = useState(
    seaLots.some(({ lot_id }) => lot_id === DEMO_AIR_SWITCH_LOT_ID)
      ? DEMO_AIR_SWITCH_LOT_ID
      : (seaLots[0]?.lot_id ?? '')
  );
  const lot = seaLots.find(({ lot_id }) => lot_id === lotId);
  const tariff = tariffs.find(({ product_id }) => product_id === lot?.product_id);
  const container = plan.containers.find(({ container_id }) => container_id === lot?.container_id);
  const shipperName = lot ? getShipperShortName(scenario, lot.shipper_id) : '';

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[440px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>판매 기간이 짧은 화주</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-5">
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

            <p className="leading-relaxed text-muted-foreground">
              도착한 뒤 팔 수 있는 기간이 짧으면 배로 가는 동안 상할 위험이 커져 해상 총비용이
              올라갑니다.
            </p>
            <Button
              size="lg"
              className="mt-auto"
              disabled={!lot || flow.isReplanning}
              onClick={() => lot && flow.runReplan({ type: 'air_switch', lot_id: lot.lot_id })}
            >
              {flow.isReplanning ? '다시 짜는 중' : `${shipperName} 항공으로 돌리고 다시 짜기`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {shipperName} {lot && getProductName(scenario, lot.product_id)} 파렛트당 총비용
              <span className="ml-2 text-base font-medium text-muted-foreground">만 원</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {tariff && (
              <>
                <CostCompare
                  rows={[
                    { label: '해상', value: tariff.sea_total_short_window, isChosen: false },
                    { label: '항공', value: tariff.air_total, isChosen: true },
                  ]}
                />
                <p className="text-muted-foreground">
                  해상 품질손실 위험을{' '}
                  <span className="num">
                    {formatManwon(tariff.sea_loss_risk_short_window)}만 원
                  </span>
                  으로 잡으면 해상이 항공보다 비쌉니다. 평소 해상은{' '}
                  <span className="num">{formatManwon(tariff.sea_total)}만 원</span>입니다.
                </p>
                <p className="rounded-2xl bg-brand-soft px-5 py-4 text-center text-xl font-bold text-brand">
                  → 항공 전환으로 파렛트당{' '}
                  <span className="num">
                    {formatManwon(tariff.sea_total_short_window - tariff.air_total)}만 원
                  </span>{' '}
                  절감
                </p>
              </>
            )}

            <div className="flex flex-col gap-4 border-t border-line pt-6">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                지금 계획
                {session.status === 'pending_confirmation' && (
                  <Badge className="bg-air">확정 대기</Badge>
                )}
              </h3>
              {container && (
                <ContainerLoadBar container={container} plan={plan} scenario={scenario} />
              )}
            </div>
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
          costDeltaLabel="지금 계획(평소 판매 기간 가정) 대비 총비용 변화"
          onApply={flow.applyAlternative}
        />
      )}

      {flow.latestOrder && <ExecutionOrderPanel planId={planId} order={flow.latestOrder} />}
    </div>
  );
}
