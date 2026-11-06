'use client';

import { cn } from 'cn';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  type ColdchainAlertT,
  type ColdchainLossT,
  type ColdchainSummaryT,
  shipperScopedAlert,
  shipperScopedTwin,
  useColdchainAlertStream,
  useColdchainContainers,
  useColdchainSettlementPreview,
  useColdchainTwin,
} from '@/apis/saas/coldchain';
import type { AlertStreamStatusT } from '@/apis/saas/platform';
import {
  useShipperCatalog,
  useShipperLots,
  useShipperPlan,
  useShipperPlans,
} from '@/apis/saas/shipper';
import {
  NO_READING_TEXT,
  TWIN_STATUS,
  TwinBody,
  TwinChips,
} from '@/app/(saas)/app/forwarder/_components/coldchain-twin';
import { ColdchainActionList } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-action-list';
import { ColdchainCsvButtons } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-csv-buttons';
import { ColdchainResidualRisks } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-residual-risks';
import { lotLabelMap } from '@/app/(saas)/app/shipper/_components/lot-label';
import { buildMyPlan, ownScopeOf } from '@/app/(saas)/app/shipper/_components/my-plan';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import {
  fmtMonthDayTime,
  fmtSignedWon,
  fmtWon,
} from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { ColdchainPlanSelect } from '@/app/(saas)/app/shipper/coldchain/_components/coldchain-plan-select';
import { TemperatureProvenance } from '@/app/(saas)/app/shipper/coldchain/_components/temperature-provenance';
import type { SettlementPreviewT } from '@/types/saas-analysis';
import type { ShipperPlanItemT } from '@/types/saas-shipper';
import { formatPercent, withoutContainerPrefix } from '@/utils/format';

const SHIPPER_COLDCHAIN = (planId: string, containerId?: string) => {
  const params = new URLSearchParams({ plan_id: planId });
  if (containerId) params.set('container_id', containerId);

  return `/app/shipper/coldchain?${params}`;
};

const STREAM_LABEL: Record<AlertStreamStatusT, { label: string; className: string }> = {
  connecting: { label: '연결 중', className: '' },
  open: { label: '실시간 연결', className: 'm2-chip-ok' },
  reconnecting: { label: '다시 연결 중', className: 'm2-chip-warn' },
  stopped: { label: '연결 끊김', className: 'm2-chip-berry' },
};

const ALERT_LEVEL_CLASS: Record<ColdchainAlertT['level'], string> = {
  critical: 'text-m2-crit',
  warning: 'text-m2-ink',
  info: 'text-m2-ink-2',
};

const newestPlanId = (plans: readonly ShipperPlanItemT[]) =>
  [...plans].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.plan_id ?? '';

export function ShipperColdchainView() {
  const plansQuery = useShipperPlans();
  const searchParams = useSearchParams();
  const router = useRouter();
  const plans = plansQuery.data ?? [];
  const planId = searchParams.get('plan_id') || newestPlanId(plans);
  const containerParam = searchParams.get('container_id') ?? '';
  const planItem = plans.find(plan => plan.plan_id === planId) ?? null;

  if (plansQuery.isError) {
    return (
      <QueryError
        message="참여 계획을 불러오지 못했습니다. 서버 연결을 확인하세요."
        onRetry={() => plansQuery.refetch()}
        isRetrying={plansQuery.isFetching}
      />
    );
  }
  if (plansQuery.isPending) return <CardSkeleton height={480} />;
  if (!planId) {
    return (
      <EmptyState
        title="참여 중인 계획이 없습니다"
        description="내 출하가 공동적재 계획에 들어가면 컨테이너 품온과 단전을 여기서 봅니다."
        action={{ href: SHIPPER_PATHS.PLANS, label: '계획 목록으로' }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="m2-card grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 py-3.5 max-[600px]:grid-cols-1">
        <span className="m2-h3">계획</span>
        <ColdchainPlanSelect
          plans={plans}
          planId={planId}
          onValueChange={next => router.replace(SHIPPER_COLDCHAIN(next))}
        />
      </div>

      <PlanColdchain
        key={planId}
        planId={planId}
        planItem={planItem}
        containerParam={containerParam}
        onSelectContainer={id => router.replace(SHIPPER_COLDCHAIN(planId, id))}
      />
    </div>
  );
}

type PlanColdchainPropsT = {
  planId: string;
  planItem: ShipperPlanItemT | null;
  containerParam: string;
  onSelectContainer: (containerId: string) => void;
};

function PlanColdchain({
  planId,
  planItem,
  containerParam,
  onSelectContainer,
}: PlanColdchainPropsT) {
  const planQuery = useShipperPlan(planId);
  const catalogQuery = useShipperCatalog();
  const summariesQuery = useColdchainContainers(planId);
  const [openedAt] = useState(() => new Date().toISOString());

  const scope = useMemo(() => {
    if (!planQuery.data || !catalogQuery.data) return null;
    const myPlan = buildMyPlan(planQuery.data, ownScopeOf(catalogQuery.data));
    const lotIds = new Set([
      ...myPlan.assignments.map(({ lot_id }) => lot_id),
      ...(planItem?.my_lot_ids ?? []),
    ]);
    const containerIds = [
      ...new Set(
        myPlan.assignments.flatMap(({ mode, container_id }) =>
          mode === 'sea' && container_id ? [container_id] : []
        )
      ),
    ];

    return { lotIds, containerIds };
  }, [planQuery.data, catalogQuery.data, planItem]);

  const ownContainerIds = scope?.containerIds ?? [];
  const ownSet = new Set(ownContainerIds);
  const summaries = (summariesQuery.data ?? []).filter(({ container_id }) =>
    ownSet.has(container_id)
  );
  const containerIds = ownContainerIds.filter(id =>
    summaries.some(({ container_id }) => container_id === id)
  );
  const containerId = containerIds.includes(containerParam)
    ? containerParam
    : (containerIds[0] ?? '');

  const streamPlanId = scope && ownContainerIds.length > 0 ? planId : '';
  const { alerts, status, reconnect } = useColdchainAlertStream(streamPlanId, alert => {
    if (!ownSet.has(alert.container_id)) return;
    if (!alert.created_at || alert.created_at < openedAt || alert.level !== 'critical') return;
    toast.error(alert.title, { description: alert.message });
  });
  const ownAlerts = scope
    ? alerts
        .filter(alert => alert.container_id === containerId)
        .map(alert => shipperScopedAlert(alert, scope.lotIds))
    : [];

  if (planQuery.isError || catalogQuery.isError) {
    return (
      <QueryError
        message="계획의 내 출하 정보를 불러오지 못했습니다."
        onRetry={() => {
          void planQuery.refetch();
          void catalogQuery.refetch();
        }}
        isRetrying={planQuery.isFetching || catalogQuery.isFetching}
      />
    );
  }
  if (!scope) return <CardSkeleton height={480} />;
  if (ownContainerIds.length === 0) {
    return (
      <EmptyState
        title="이 계획에는 내 화물이 실린 컨테이너가 없습니다"
        description="해상으로 배정된 내 출하가 있어야 컨테이너 품온을 볼 수 있습니다."
      />
    );
  }
  if (summariesQuery.isError && !summariesQuery.data) {
    return (
      <QueryError
        message="컨테이너 현황을 불러오지 못했습니다."
        onRetry={() => summariesQuery.refetch()}
        isRetrying={summariesQuery.isFetching}
      />
    );
  }
  if (summariesQuery.isPending) return <CardSkeleton height={480} />;
  if (containerIds.length === 0) {
    return <EmptyState title="내 화물이 실린 컨테이너에 측정값이 아직 없습니다" />;
  }

  const stream = STREAM_LABEL[status];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3 max-[1180px]:grid-cols-2">
        {containerIds.map(id => (
          <ContainerTile
            key={id}
            planId={planId}
            ownLotIds={scope.lotIds}
            summary={summaries.find(({ container_id }) => container_id === id) ?? null}
            containerId={id}
            isActive={id === containerId}
            onSelect={() => onSelectContainer(id)}
          />
        ))}
      </div>

      <div className="@container min-w-0">
        <div className="grid min-w-0 grid-cols-1 gap-4 @min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <ContainerTwin planId={planId} containerId={containerId} ownLotIds={scope.lotIds} />
          <div className="flex min-w-0 flex-col gap-4">
            <section className="m2-card">
              <div className="m2-card-h flex-wrap gap-2">
                <h2 className="m2-h2">실시간 알림</h2>
                <span className={cn('m2-chip', stream.className)}>{stream.label}</span>
                {status === 'stopped' && (
                  <button type="button" className="m2-btn m2-btn-sec m2-btn-sm" onClick={reconnect}>
                    다시 연결
                  </button>
                )}
              </div>
              {ownAlerts.length === 0 ? (
                <p className="m2-sub">아직 알림이 없습니다.</p>
              ) : (
                <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
                  {ownAlerts.map(alert => (
                    <li key={alert.seq} className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3">
                      <time className="m2-num text-[12px] text-m2-muted">
                        {fmtMonthDayTime(alert.at)}
                      </time>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'text-[13px] font-semibold',
                            ALERT_LEVEL_CLASS[alert.level]
                          )}
                        >
                          {withoutContainerPrefix(alert.title)}
                        </p>
                        <p className="text-[12.5px] text-m2-ink-2">{alert.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

type ContainerTilePropsT = {
  planId: string;
  ownLotIds: ReadonlySet<string>;
  containerId: string;
  summary: ColdchainSummaryT | null;
  isActive: boolean;
  onSelect: () => void;
};

function ContainerTile({
  planId,
  ownLotIds,
  containerId,
  summary,
  isActive,
  onSelect,
}: ContainerTilePropsT) {
  const twinQuery = useColdchainTwin(planId, containerId);
  const status = TWIN_STATUS[summary?.status ?? 'no_data'];
  const delta = useMemo(
    () => (twinQuery.data ? shipperScopedTwin(twinQuery.data, ownLotIds).loss.delta_krw : null),
    [twinQuery.data, ownLotIds]
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        'm2-block flex flex-col gap-2 text-left',
        isActive && 'shadow-[0_0_0_2px_var(--m2-brand)]'
      )}
    >
      <div className="flex min-w-0 flex-wrap items-start gap-2">
        <span className="m2-h3 min-w-0 flex-1 text-[15px]" style={{ overflowWrap: 'anywhere' }}>
          {containerId}
        </span>
        <span className={status.chip}>{status.label}</span>
      </div>
      <TemperatureProvenance twin={twinQuery.data ?? null} compact />
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12.5px]">
        <dt className="text-m2-muted">품온</dt>
        <dd className="m2-num text-right font-semibold">
          {typeof summary?.temp_c === 'number' ? `${summary.temp_c}℃` : '–'}
        </dd>
        <dt className="text-m2-muted">누적 단전</dt>
        <dd className="m2-num text-right font-semibold">
          {summary?.cumulative_outage_minutes ?? 0}분
        </dd>
        <dt className="text-m2-muted">센서 손실률</dt>
        <dd className="m2-num text-right font-semibold">
          {formatPercent(summary?.sensor_loss_rate)}
        </dd>
        <dt className="text-m2-muted">내 추가 손실</dt>
        <dd className={cn('m2-num text-right font-semibold', delta && delta > 0 && 'text-m2-crit')}>
          {fmtSignedWon(delta)}
        </dd>
      </dl>
    </button>
  );
}

type ContainerTwinPropsT = {
  planId: string;
  containerId: string;
  ownLotIds: ReadonlySet<string>;
};

function ContainerTwin({ planId, containerId, ownLotIds }: ContainerTwinPropsT) {
  const twinQuery = useColdchainTwin(planId, containerId);
  const twin = useMemo(
    () => (twinQuery.data ? shipperScopedTwin(twinQuery.data, ownLotIds) : null),
    [twinQuery.data, ownLotIds]
  );
  const hasData = !!twin?.has_data;
  const previewQuery = useColdchainSettlementPreview(planId, containerId, hasData);
  const preview = hasData ? (previewQuery.data ?? null) : null;

  if (twinQuery.isError && !twin) {
    return (
      <QueryError
        message="센서 측정값을 불러오지 못했습니다."
        onRetry={() => twinQuery.refetch()}
        isRetrying={twinQuery.isFetching}
      />
    );
  }
  if (twinQuery.isPending) return <CardSkeleton height={420} />;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className="m2-card min-w-0">
        <div className="m2-card-h flex-col items-stretch gap-3">
          <h2 className="m2-h2 min-w-0" style={{ overflowWrap: 'anywhere' }}>
            {containerId} 품온 · 전원
          </h2>
          <div className="flex max-w-full min-w-0 flex-wrap items-center gap-1.5">
            {twin ? <TwinChips twin={twin} /> : null}
          </div>
          <div className="flex min-w-0 flex-wrap">
            <ColdchainCsvButtons planId={planId} containerId={containerId} hasData={hasData} />
          </div>
        </div>
        <TemperatureProvenance twin={twin} />
        {twin && hasData ? (
          <TwinBody twin={twin} containerId={containerId} />
        ) : (
          <p className="m2-sub py-6 text-center">{NO_READING_TEXT}</p>
        )}
      </section>
      {twin ? (
        <>
          <MyLotLoss loss={twin.loss} preview={preview} ownLotIds={ownLotIds} />
          <ColdchainActionList
            planId={planId}
            containerId={containerId}
            actions={twin.actions}
            canAct={false}
          />
          <ColdchainResidualRisks risks={twin.residual_risks} />
        </>
      ) : null}
    </div>
  );
}

type MyLotLossPropsT = {
  loss: ColdchainLossT;
  preview: SettlementPreviewT | null;
  ownLotIds: ReadonlySet<string>;
};

function MyLotLoss({ loss, preview, ownLotIds }: MyLotLossPropsT) {
  const lots = loss.lots ?? [];
  const shipperLots = useShipperLots();
  const catalog = useShipperCatalog();
  const labels = useMemo(
    () => lotLabelMap(shipperLots.data, catalog.data ?? null),
    [shipperLots.data, catalog.data]
  );
  const previewLots = (preview?.lots ?? []).filter(lot => ownLotIds.has(lot.lot_id));
  const refundChange = previewLots.length
    ? previewLots.reduce((sum, lot) => sum + lot.refund_change, 0)
    : null;

  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <h2 className="m2-h2">내 로트 예상 손실</h2>
      </div>
      {lots.length === 0 ? (
        <p className="m2-sub">이 컨테이너에 실린 내 로트가 없습니다.</p>
      ) : (
        <table className="m2-table">
          <thead>
            <tr>
              <th scope="col">로트</th>
              <th scope="col" className="text-right">
                파렛트
              </th>
              <th scope="col" className="text-right">
                손실률 (계획 → 예상)
              </th>
              <th scope="col" className="text-right">
                예상 손실
              </th>
              <th scope="col" className="text-right">
                추가 손실
              </th>
            </tr>
          </thead>
          <tbody>
            {lots.map(lot => (
              <tr key={lot.lot_id}>
                <td title={lot.lot_id}>{labels.get(lot.lot_id) ?? '내 출하'}</td>
                <td className="m2-num text-right">{lot.pallets}</td>
                <td className="m2-num text-right">
                  {formatPercent(lot.planned_loss_rate)} → {formatPercent(lot.predicted_loss_rate)}
                </td>
                <td className="m2-num text-right">{fmtWon(lot.predicted_loss_krw)}</td>
                <td className="m2-num text-right">{fmtSignedWon(lot.delta_krw)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3} className="text-left">
                합계
              </th>
              <td className="m2-num text-right font-semibold">{fmtWon(loss.predicted_loss_krw)}</td>
              <td className="m2-num text-right font-semibold">{fmtSignedWon(loss.delta_krw)}</td>
            </tr>
          </tfoot>
        </table>
      )}
      {refundChange !== null ? (
        <p className="m2-note">
          이대로 도착하면 내 성과보수 환급 변동 {fmtSignedWon(refundChange)}
        </p>
      ) : null}
    </section>
  );
}
