'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { usePlatformReplanFlow } from '@/apis/saas/platform';
import { usePlatformAirSeaCompare } from '@/apis/saas/platform-analysis';
import {
  useApplyChangeRequest,
  useChangeRequestReplan,
  usePlatformChangeRequests,
} from '@/apis/saas/platform-change-requests';
import { ContainerBlock } from '@/app/(saas)/app/platform/_components/container-plan-card';
import { so2Text } from '@/app/(saas)/app/platform/_components/m2-format';
import { containerViews } from '@/app/(saas)/app/platform/_components/plan-model';
import { SegTabs } from '@/app/(saas)/app/platform/_components/seg-tabs';
import { AirCompareCard } from '@/app/(saas)/app/platform/plans/detail/_components/air-compare-card';
import {
  ChangeRequestInbox,
  openRequestParams,
} from '@/app/(saas)/app/platform/plans/detail/_components/change-request-inbox';
import { DelayForecastCard } from '@/app/(saas)/app/platform/plans/detail/_components/delay-forecast-card';
import { PlatformOrderCard } from '@/app/(saas)/app/platform/plans/detail/_components/platform-order-card';
import { ReplanAddLotTab } from '@/app/(saas)/app/platform/plans/detail/_components/replan-add-lot-tab';
import { ReplanCandidatesCard } from '@/app/(saas)/app/platform/plans/detail/_components/replan-candidates-card';
import { ReplanDelayTab } from '@/app/(saas)/app/platform/plans/detail/_components/replan-delay-tab';
import { useReplanGate } from '@/app/(saas)/app/platform/plans/detail/_components/replan-gate';
import { ScheduleCheckCard } from '@/app/(saas)/app/platform/plans/detail/_components/schedule-check-card';
import { ReplanAlternatives } from '@/components/replan-alternatives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { AlternativeIdT, PlanEventT, ReplanResponseT } from '@/types/api';
import type { SaasPlanSessionT } from '@/types/api-saas';
import type { PlatformChangeRequestT } from '@/types/saas-platform';
import { getProductName, getShipperShortName } from '@/utils/scenario';

type ChangeKindT = 'reduce' | 'air_switch' | 'delay' | 'add_lot' | 'requests';

type TriggerT = { label: string; focusContainerId: string | null };

type RequestResultT = { requestId: string; replan: ReplanResponseT };

type ShownResultT = {
  replan: ReplanResponseT;
  appliedId: AlternativeIdT | null;
  applyingId: AlternativeIdT | null;
  onApply: (alternativeId: AlternativeIdT) => void;
};

const REQUEST_TYPE_LABEL: Record<PlatformChangeRequestT['type'], string> = {
  reduce: '감축',
  cancel: '취소',
  air_switch: '항공 전환',
};

const kindOptions = (openCount: number): { value: ChangeKindT; label: string }[] => [
  { value: 'reduce', label: '취소 · 감축' },
  { value: 'air_switch', label: '항공 전환' },
  { value: 'delay', label: '선석 일정 변경' },
  { value: 'add_lot', label: '출하 추가' },
  { value: 'requests', label: openCount > 0 ? `화주 요청 ${openCount}` : '화주 요청' },
];

export function ReplanSection({ session }: { session: SaasPlanSessionT }) {
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
  const views = containerViews(session);
  const containerView = views.find(({ id }) => id === container?.container_id) ?? null;
  const isShortSellWindow =
    scenario.lots.find(({ id }) => id === lot?.lot_id)?.sell_window === 'short';

  const flow = usePlatformReplanFlow(planId);
  const gate = useReplanGate(session);
  const requestReplan = useChangeRequestReplan();
  const applyRequest = useApplyChangeRequest();
  const openRequests = usePlatformChangeRequests(openRequestParams(planId));
  const [trigger, setTrigger] = useState<TriggerT | null>(null);
  const [requestResult, setRequestResult] = useState<RequestResultT | null>(null);
  const isBusy = flow.isReplanning || requestReplan.isPending;
  const airCompare = usePlatformAirSeaCompare(
    planId,
    kind === 'air_switch' && lot ? lot.lot_id : ''
  );
  const isAirInfeasible = airCompare.data?.air.feasible === false;
  const isAirPending = kind === 'air_switch' && airCompare.isPending;

  const clearRequest = () => {
    setRequestResult(null);
    applyRequest.reset();
  };

  const runEvent = (event: PlanEventT, label: string, focusContainerId: string | null) => {
    clearRequest();
    setTrigger({ label, focusContainerId });
    flow.runReplan(event);
  };

  const loadExternal = (
    replan: ReplanResponseT,
    label: string,
    focusContainerId: string | null
  ) => {
    clearRequest();
    setTrigger({ label, focusContainerId });
    flow.loadExternalReplan(replan);
  };

  const runAddLot = (lotId: string, label: string) => {
    clearRequest();
    setTrigger({ label, focusContainerId: null });
    flow.runAddLot(lotId);
  };

  const dropRejected = (requestId: string) => {
    if (requestResult?.requestId === requestId) {
      clearRequest();
      setTrigger(null);
      flow.loadExternalReplan(null);
    }
  };

  const runRequest = (request: PlatformChangeRequestT) => {
    const focusContainerId =
      plan.assignments.find(({ lot_id }) => lot_id === request.lot_id)?.container_id ?? null;
    requestReplan.mutate(request.request_id, {
      onSuccess: ({ replan }) => {
        applyRequest.reset();
        setRequestResult({ requestId: request.request_id, replan });
        setTrigger({
          label: `화주 요청 · ${request.shipper_org_name} ${REQUEST_TYPE_LABEL[request.type]}`,
          focusContainerId,
        });
      },
    });
  };

  const buildEvent = (): PlanEventT | null => {
    if (!lot) return null;
    if (kind === 'air_switch') return { type: 'air_switch', lot_id: lot.lot_id };
    if (isUnchanged) return null;

    return pallets === 0
      ? { type: 'cancel', lot_id: lot.lot_id }
      : { type: 'reduce', lot_id: lot.lot_id, new_pallets: pallets };
  };

  const shipperName = lot ? getShipperShortName(scenario, lot.shipper_id) : '';
  const reduceLabel = isUnchanged
    ? '줄일 파렛트 수를 고르세요'
    : `${shipperName} ${pallets === 0 ? '전량' : `${maxPallets - pallets}파렛트`} 취소하고 다시 짜기`;
  const airLabel = () => {
    if (isAirInfeasible) return '항공편이 맞지 않아 전환할 수 없습니다';
    if (airCompare.data?.cheaper === 'sea') {
      return `${shipperName} 항공으로 돌리고 다시 짜기 (총비용 증가)`;
    }

    return `${shipperName} 항공으로 돌리고 다시 짜기`;
  };
  const actionLabel = kind === 'air_switch' ? airLabel() : reduceLabel;
  const isAirBlocked = kind === 'air_switch' && (isAirInfeasible || isAirPending);

  const runLotReplan = () => {
    const event = buildEvent();
    if (event) runEvent(event, actionLabel, container?.container_id ?? null);
  };

  const shownResult = (): ShownResultT | null => {
    if (requestResult) {
      const { requestId, replan } = requestResult;
      const variables = applyRequest.variables;
      const isThisRequest = variables?.requestId === requestId;

      return {
        replan,
        appliedId: applyRequest.isSuccess && isThisRequest ? variables.alternative_id : null,
        applyingId: applyRequest.isPending && isThisRequest ? variables.alternative_id : null,
        onApply: alternativeId => applyRequest.mutate({ requestId, alternative_id: alternativeId }),
      };
    }
    if (!flow.replanResult) return null;

    return {
      replan: flow.replanResult,
      appliedId: flow.appliedId,
      applyingId: flow.applyingId,
      onApply: flow.applyAlternative,
    };
  };
  const shown = isBusy ? null : shownResult();
  const isLotKind = kind === 'reduce' || kind === 'air_switch';
  const sideViews = isLotKind ? [] : views;

  return (
    <div className="@container flex flex-col gap-4">
      <ReplanCandidatesCard session={session} isReplanning={isBusy} onRun={runEvent} />

      <div className="grid grid-cols-1 items-start gap-4 @min-[900px]:grid-cols-2">
        <ScheduleCheckCard
          key={`schedule:${planId}:${session.version}`}
          session={session}
          isReplanning={isBusy}
          onRun={runEvent}
        />
        <DelayForecastCard
          key={`forecast:${planId}:${session.version}`}
          session={session}
          isReplanning={isBusy}
          onLoad={loadExternal}
        />
      </div>

      <section className="m2-card">
        <div className="m2-card-h">
          <div>
            <h2 className="m2-h2">재최적화</h2>
            <p className="m2-sub">
              화주 취소·감축, 항공 전환, 선석 일정 변경, 출하 추가, 화주 변경 요청이 생기면 세 가지
              안을 다시 계산해 고릅니다.
            </p>
          </div>
        </div>
        <SegTabs<ChangeKindT>
          label="바꿀 일"
          value={kind}
          onChange={setKind}
          options={kindOptions(openRequests.data?.length ?? 0)}
          className="mb-4"
        />

        {kind === 'requests' ? (
          <ChangeRequestInbox
            session={session}
            pendingRequestId={requestReplan.isPending ? (requestReplan.variables ?? null) : null}
            activeRequestId={requestResult?.requestId ?? null}
            isBusy={isBusy}
            onReplan={runRequest}
            onRejected={dropRejected}
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 @min-[900px]:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            {kind === 'delay' && (
              <ReplanDelayTab session={session} isReplanning={isBusy} onRun={runEvent} />
            )}
            {kind === 'add_lot' && (
              <ReplanAddLotTab
                session={session}
                isReplanning={isBusy}
                onAddLot={runAddLot}
                addLotBlock={gate.addLotBlock}
                forwarderName={gate.forwarderName}
              />
            )}
            {isLotKind && seaLots.length === 0 && (
              <p className="m2-sub mt-0">해상으로 가는 로트가 없어 바꿀 대상이 없습니다.</p>
            )}
            {isLotKind && seaLots.length > 0 && (
              <div className="flex min-w-0 flex-col gap-4">
                <div className="m2-lbl">대상 로트</div>
                <Select value={lot?.lot_id ?? ''} onValueChange={setPickedLotId}>
                  <SelectTrigger
                    aria-label="대상 로트"
                    className="h-10 w-full min-w-0 rounded-[12px] bg-white *:data-[slot=select-value]:truncate"
                  >
                    <SelectValue placeholder="로트 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {seaLots.map(
                      ({ lot_id, shipper_id, product_id, pallets: lotPallets, container_id }) => (
                        <SelectItem key={lot_id} value={lot_id}>
                          {getShipperShortName(scenario, shipper_id)}{' '}
                          {so2Text(getProductName(scenario, product_id))} {lotPallets}파렛트 ·{' '}
                          {container_id}
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

                {kind === 'air_switch' && lot && (
                  <AirCompareCard
                    planId={planId}
                    lotId={lot.lot_id}
                    isShortSellWindow={isShortSellWindow}
                  />
                )}

                <button
                  type="button"
                  className="m2-btn m2-btn-pri m2-btn-lg w-full"
                  disabled={!lot || isUnchanged || isBusy || isAirBlocked}
                  onClick={runLotReplan}
                >
                  {flow.isReplanning ? '다시 짜는 중' : actionLabel}
                </button>
              </div>
            )}

            <div className="flex min-w-0 flex-col gap-3">
              <div className="m2-lbl">지금 계획</div>
              {isLotKind && containerView && <ContainerBlock container={containerView} />}
              {isLotKind && !containerView && (
                <p className="m2-sub mt-0">로트를 고르면 실린 컨테이너를 보여줍니다.</p>
              )}
              {sideViews.map(view => (
                <ContainerBlock key={view.id} container={view} />
              ))}
              {!isLotKind && sideViews.length === 0 && (
                <p className="m2-sub mt-0">사용 중인 컨테이너가 없습니다.</p>
              )}
            </div>
          </div>
        )}
      </section>

      {isBusy && (
        <div className="m2-card flex flex-col gap-3" aria-busy>
          <p className="m2-sub mt-0">
            {trigger && flow.isReplanning ? `${trigger.label} · ` : ''}세 가지 안을 계산하는 중
          </p>
          <Skeleton className="h-48 w-full rounded-[14px]" />
        </div>
      )}

      {shown && (
        <div className="flex flex-col gap-2">
          {trigger && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="m2-chip m2-chip-brand">{trigger.label}</span>
              {requestResult && (
                <span className="m2-sub mt-0">고른 안을 적용하면 화주 요청도 반영 처리됩니다.</span>
              )}
            </div>
          )}
          <ReplanAlternatives
            replan={shown.replan}
            scenario={scenario}
            focusContainerId={trigger?.focusContainerId ?? null}
            appliedId={shown.appliedId}
            applyingId={shown.applyingId}
            onApply={shown.onApply}
            variant="saas"
            current={{ plan, routes: session.routes }}
            applyBlockedReason={gate.applyBlockReason(shown.replan)}
          />
        </div>
      )}

      {flow.latestOrder && <PlatformOrderCard order={flow.latestOrder} />}
    </div>
  );
}
