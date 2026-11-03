'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { usePlatformReplanFlow } from '@/apis/saas/platform';
import { ContainerLoadBar } from '@/components/container-load-bar';
import { ExecutionOrderPanel } from '@/components/execution-order';
import { ReplanAlternatives } from '@/components/replan-alternatives';
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
  const [palletDraft, setPalletDraft] = useState<{ lotId: string; pallets: number } | null>(null);
  const maxPallets = lot?.pallets ?? 0;
  const pallets =
    palletDraft && palletDraft.lotId === lot?.lot_id
      ? Math.min(palletDraft.pallets, maxPallets)
      : maxPallets;
  const setNewPallets = (next: number) => {
    if (lot) setPalletDraft({ lotId: lot.lot_id, pallets: next });
  };
  const isUnchanged = kind === 'reduce' && pallets === maxPallets;
  const container = plan.containers.find(({ container_id }) => container_id === lot?.container_id);

  const flow = usePlatformReplanFlow(planId);

  const buildEvent = (): PlanEventT | null => {
    if (!lot) return null;
    if (kind === 'air_switch') return { type: 'air_switch', lot_id: lot.lot_id };
    if (isUnchanged) return null;

    return pallets === 0
      ? { type: 'cancel', lot_id: lot.lot_id }
      : { type: 'reduce', lot_id: lot.lot_id, new_pallets: pallets };
  };

  const runReplan = () => {
    const event = buildEvent();
    if (event) flow.runReplan(event);
  };

  const shipperName = lot ? getShipperShortName(scenario, lot.shipper_id) : '';
  const reduceLabel = isUnchanged
    ? '줄일 파렛트 수를 고르세요'
    : `${shipperName} ${pallets === 0 ? '전량' : `${maxPallets - pallets}파렛트`} 취소하고 다시 짜기`;
  const actionLabel =
    kind === 'air_switch' ? `${shipperName} 항공으로 돌리고 다시 짜기` : reduceLabel;

  return (
    <div className="@container flex flex-col gap-4">
      <section className="m2-card">
        <div className="mb-4">
          <h2 className="m2-h2">재최적화</h2>
          <p className="m2-sub">
            화주 취소·감축이나 항공 전환이 생기면 세 가지 안을 다시 계산해 고릅니다.
          </p>
        </div>
        <div className="grid grid-cols-1 items-start gap-8 @min-[960px]:grid-cols-[360px_minmax(0,1fr)]">
          {seaLots.length === 0 ? (
            <p className="m2-sub mt-0">해상으로 가는 로트가 없어 바꿀 대상이 없습니다.</p>
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
                  <span className="text-m2-muted">
                    <span className="m2-num">{lot?.pallets}</span> →
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="m2-btn m2-btn-sec w-10 px-0"
                      aria-label="한 파렛트 줄이기"
                      disabled={pallets <= 0}
                      onClick={() => setNewPallets(pallets - 1)}
                    >
                      <MinusIcon size={16} />
                    </button>
                    <output className="m2-num w-10 text-center text-[24px] font-bold">
                      {pallets}
                    </output>
                    <button
                      type="button"
                      className="m2-btn m2-btn-sec w-10 px-0"
                      aria-label="한 파렛트 늘리기"
                      disabled={pallets >= maxPallets}
                      onClick={() => setNewPallets(pallets + 1)}
                    >
                      <PlusIcon size={16} />
                    </button>
                    <span className="text-m2-muted">파렛트</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="m2-btn m2-btn-pri m2-btn-lg w-full"
                disabled={!lot || isUnchanged || flow.isReplanning}
                onClick={runReplan}
              >
                {flow.isReplanning ? '다시 짜는 중' : actionLabel}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-4 border-m2-line @min-[960px]:border-l @min-[960px]:pl-8">
            <h3 className="m2-h3">지금 계획</h3>
            {container ? (
              <ContainerLoadBar container={container} plan={plan} scenario={scenario} />
            ) : (
              <p className="m2-sub mt-0">로트를 고르면 실린 컨테이너를 보여줍니다.</p>
            )}
          </div>
        </div>
      </section>

      {flow.replanResult && (
        <ReplanAlternatives
          replan={flow.replanResult}
          scenario={scenario}
          focusContainerId={container?.container_id ?? null}
          appliedId={flow.appliedId}
          applyingId={flow.applyingId}
          onApply={flow.applyAlternative}
          variant="saas"
          current={{ plan, routes: session.routes }}
        />
      )}

      {flow.latestOrder && (
        <ExecutionOrderPanel planId={planId} order={flow.latestOrder} role="platform" />
      )}
    </div>
  );
}
