'use client';

import { cn } from 'cn';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  useColdchainContainers,
  useColdchainSettlementPreview,
  useColdchainTwin,
} from '@/apis/saas/coldchain';
import {
  type AlertStreamStatusT,
  usePlatformAlertStream,
  usePlatformPlan,
  usePlatformPlans,
} from '@/apis/saas/platform';
import {
  NO_READING_TEXT,
  TwinBody,
  TwinChips,
} from '@/app/(saas)/app/forwarder/_components/coldchain-twin';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { readPlanQuery, withPlanQuery } from '@/app/(saas)/app/platform/_components/paths';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { ColdchainActionList } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-action-list';
import { ColdchainCsvButtons } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-csv-buttons';
import { ColdchainGensetCandidates } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-genset-candidates';
import { ColdchainLossBanner } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-loss-banner';
import { ColdchainLossTable } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-loss-table';
import { ColdchainResidualRisks } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-residual-risks';
import { AlertFeed } from '@/components/alert-feed';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { AlertT } from '@/types/api';
import type { TwinSummaryT } from '@/types/saas-platform';
import { formatPercent } from '@/utils/format';
import { planOptionLabel } from '@/utils/plan-label';

const STATUS_STYLE: Record<TwinSummaryT['status'], { label: string; className: string }> = {
  no_data: { label: '측정값 없음', className: '' },
  normal: { label: '정상', className: 'm2-chip-ok' },
  warning: { label: '경고', className: 'm2-chip-warn' },
  critical: { label: '위험', className: 'm2-chip-berry' },
};

const STREAM_LABEL: Record<AlertStreamStatusT, { label: string; className: string }> = {
  connecting: { label: '연결 중', className: '' },
  open: { label: '실시간 연결', className: 'm2-chip-ok' },
  reconnecting: { label: '다시 연결 중', className: 'm2-chip-warn' },
  stopped: { label: '연결 끊김', className: 'm2-chip-berry' },
};

export function ColdchainView() {
  const plansQuery = usePlatformPlans();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const planId = readPlanQuery(searchParams) ?? plansQuery.data?.[0]?.plan_id ?? '';

  const selectPlan = (nextPlanId: string) => {
    router.replace(
      `${pathname}?${withPlanQuery(new URLSearchParams(searchParams.toString()), nextPlanId)}`
    );
  };

  if (plansQuery.isError) {
    return (
      <QueryError
        error={plansQuery.error}
        subject="계획 목록을"
        onRetry={() => plansQuery.refetch()}
        isRetrying={plansQuery.isFetching}
      />
    );
  }
  if (plansQuery.isPending) return <Skeleton className="h-96 rounded-[18px]" />;
  if (!planId) {
    return (
      <EmptyState
        title="관제할 계획이 없습니다"
        description="공동적재 계획을 만들면 컨테이너별 품온 · 전원을 볼 수 있습니다."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="m2-card flex flex-wrap items-center gap-3 py-3.5">
        <span className="m2-h3">계획</span>
        <Select value={planId} onValueChange={selectPlan}>
          <SelectTrigger aria-label="계획" className="w-96 max-w-full rounded-[12px] bg-white">
            <SelectValue placeholder="계획 선택" />
          </SelectTrigger>
          <SelectContent>
            {plansQuery.data.map(plan => (
              <SelectItem key={plan.plan_id} value={plan.plan_id}>
                {planOptionLabel(plan)}
              </SelectItem>
            ))}
            {!plansQuery.data.some(({ plan_id }) => plan_id === planId) && (
              <SelectItem value={planId}>{planId}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <PlanColdchain key={planId} planId={planId} />
    </div>
  );
}

function PlanColdchain({ planId }: { planId: string }) {
  const planQuery = usePlatformPlan(planId);
  const summariesQuery = useColdchainContainers(planId);
  const [openedAt] = useState(() => new Date().toISOString());
  const [pickedContainerId, setPickedContainerId] = useState('');

  const streamPlanId = planQuery.isSuccess ? planId : '';
  const { alerts, status, reconnect } = usePlatformAlertStream(streamPlanId, (alert: AlertT) => {
    if (!alert.created_at || alert.created_at < openedAt || alert.level === 'info') return;
    const notify = alert.level === 'critical' ? toast.error : toast.warning;
    notify(alert.title, { description: alert.message });
  });

  const usedContainerIds =
    planQuery.data?.plan.containers
      .filter(({ used }) => used)
      .map(({ container_id }) => container_id) ?? [];
  const summaries = summariesQuery.data ?? [];
  const containerIds = [
    ...new Set([...usedContainerIds, ...summaries.map(({ container_id }) => container_id)]),
  ];
  const containerId = containerIds.includes(pickedContainerId)
    ? pickedContainerId
    : (containerIds[0] ?? '');
  const summaryOf = (id: string) => summaries.find(({ container_id }) => container_id === id);
  const stream = STREAM_LABEL[status];

  if (planQuery.isError) {
    return (
      <QueryError
        error={planQuery.error}
        subject="계획을"
        onRetry={() => planQuery.refetch()}
        isRetrying={planQuery.isFetching}
      />
    );
  }
  if (planQuery.isPending) return <Skeleton className="h-96 rounded-[18px]" />;

  return (
    <div className="flex flex-col gap-4">
      {summariesQuery.isError && !summariesQuery.data && (
        <QueryError
          error={summariesQuery.error}
          subject="컨테이너 현황을"
          onRetry={() => summariesQuery.refetch()}
          isRetrying={summariesQuery.isFetching}
        />
      )}

      {containerIds.length === 0 ? (
        <EmptyState
          title="이 계획에 실린 컨테이너가 없습니다"
          description="해상 배정이 없는 계획은 콜드체인 관제 대상이 아닙니다."
        />
      ) : (
        <div className="grid grid-cols-4 gap-3 max-[1180px]:grid-cols-2">
          {containerIds.map(id => (
            <ContainerTile
              key={id}
              containerId={id}
              summary={summaryOf(id)}
              isActive={id === containerId}
              onSelect={() => setPickedContainerId(id)}
            />
          ))}
        </div>
      )}

      {containerId && (
        <div className="@container">
          <div className="grid grid-cols-1 gap-4 @min-[1000px]:grid-cols-[minmax(0,1fr)_400px]">
            <ContainerTwin planId={planId} containerId={containerId} />
            <div className="flex flex-col gap-4">
              <div className="m2-card flex flex-wrap items-center gap-2 py-3 text-[12.5px] text-m2-muted">
                알림 스트림 <span className={cn('m2-chip', stream.className)}>{stream.label}</span>
                {status === 'stopped' && (
                  <button type="button" className="m2-btn m2-btn-sec m2-btn-sm" onClick={reconnect}>
                    다시 연결
                  </button>
                )}
              </div>
              <AlertFeed alerts={alerts.filter(alert => alert.container_id === containerId)} />
              <ColdchainGensetCandidates planId={planId} containerId={containerId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ContainerTilePropsT = {
  containerId: string;
  summary: TwinSummaryT | undefined;
  isActive: boolean;
  onSelect: () => void;
};

function ContainerTile({ containerId, summary, isActive, onSelect }: ContainerTilePropsT) {
  const style = STATUS_STYLE[summary?.status ?? 'no_data'];

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
      <div className="flex items-center gap-2">
        <span className="m2-h3 text-[15px]">{containerId}</span>
        <span className={cn('m2-chip', style.className)}>{style.label}</span>
      </div>
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
        <dt className="text-m2-muted">열린 조치</dt>
        <dd className="m2-num text-right font-semibold">{summary?.open_actions ?? 0}건</dd>
      </dl>
    </button>
  );
}

function ContainerTwin({ planId, containerId }: { planId: string; containerId: string }) {
  const twinQuery = useColdchainTwin(planId, containerId);
  const twin = twinQuery.data ?? null;
  const hasData = !!twin?.has_data;
  const previewQuery = useColdchainSettlementPreview(planId, containerId, hasData);
  const preview = hasData ? (previewQuery.data ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      {twinQuery.isError && !twin && (
        <QueryError
          error={twinQuery.error}
          subject="센서 측정값을"
          onRetry={() => twinQuery.refetch()}
          isRetrying={twinQuery.isFetching}
        />
      )}
      {twin && hasData ? <ColdchainLossBanner twin={twin} preview={preview} /> : null}
      {twinQuery.isPending ? (
        <Skeleton className="h-96 rounded-[18px]" />
      ) : (
        <section className="m2-card">
          <div className="m2-card-h flex-wrap gap-2">
            <h2 className="m2-h2">{containerId} 품온 · 전원</h2>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {twin ? <TwinChips twin={twin} /> : null}
              <ColdchainCsvButtons planId={planId} containerId={containerId} hasData={hasData} />
            </div>
          </div>
          {twin && hasData ? (
            <TwinBody twin={twin} containerId={containerId} />
          ) : (
            <p className="m2-sub py-6 text-center">{NO_READING_TEXT}</p>
          )}
        </section>
      )}
      {twin ? (
        <>
          {hasData ? <ColdchainLossTable loss={twin.loss} preview={preview} /> : null}
          <ColdchainActionList
            planId={planId}
            containerId={containerId}
            actions={twin.actions}
            canAct
          />
          <ColdchainResidualRisks risks={twin.residual_risks} />
        </>
      ) : (
        <section className="m2-card">
          <h2 className="m2-h2">자동 조치</h2>
          <p className="m2-sub">
            기기 관리에서 센서를 이 컨테이너에 연결하면 측정값과 조치가 들어옵니다.
          </p>
        </section>
      )}
    </div>
  );
}
