'use client';

import { cn } from 'cn';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useColdchainTwin } from '@/apis/saas/coldchain';
import {
  useForwarderAlertStream,
  useForwarderContainers,
  useForwarderPlan,
  useForwarderPlans,
} from '@/apis/saas/forwarder';
import {
  NO_READING_TEXT,
  TWIN_STATUS,
  TwinBody,
  TwinChips,
} from '@/app/(saas)/app/forwarder/_components/coldchain-twin';
import { formatMinutes, monthDayTime } from '@/app/(saas)/app/forwarder/_components/format';
import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import { EmptyState, QueryError } from '@/app/(saas)/app/forwarder/_components/query-state';
import { useForwarderOrgName } from '@/app/(saas)/app/forwarder/_components/use-org-name';
import { ColdchainActionList } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-action-list';
import { ColdchainCsvButtons } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-csv-buttons';
import { ColdchainGensetCandidates } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-genset-candidates';
import { ColdchainResidualRisks } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-residual-risks';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  ForwarderAlertT,
  ForwarderStreamStateT,
  ForwarderTwinSummaryT,
} from '@/types/saas-forwarder';
import { formatPercent, withoutContainerPrefix } from '@/utils/format';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

const STREAM_LABEL: Record<ForwarderStreamStateT, { label: string; chip: string }> = {
  connecting: { label: '연결 중', chip: 'm2-chip' },
  open: { label: '실시간 수신 중', chip: 'm2-chip m2-chip-ok' },
  retrying: { label: '다시 연결 중', chip: 'm2-chip m2-chip-warn' },
  stopped: { label: '연결 끊김', chip: 'm2-chip m2-chip-berry' },
};

const ALERT_COLOR: Record<ForwarderAlertT['level'], string> = {
  critical: 'text-m2-crit',
  warning: 'text-m2-warn-ink',
  info: 'text-m2-ok-ink',
};

export function ColdchainView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgName = useForwarderOrgName();
  const plans = useForwarderPlans();
  const header = (
    <ForwarderPageHeader
      eyebrow={orgName ? `콜드체인 · ${orgName}` : '콜드체인'}
      title="운송 중인 컨테이너의 품온 · 전원"
      sub="컨테이너 목록은 10초, 선택한 컨테이너는 5초마다 새로 받습니다"
    />
  );

  if (plans.isPending) {
    return (
      <>
        {header}
        <div aria-busy className="flex flex-col gap-4">
          <Skeleton className="h-12 w-96 rounded-xl" />
          <Skeleton className="h-96 rounded-[18px]" />
        </div>
      </>
    );
  }

  if (plans.isError) {
    return (
      <>
        {header}
        <QueryError
          message="배정된 항차를 불러오지 못했습니다. 서버 연결을 확인하세요."
          onRetry={() => plans.refetch()}
          isRetrying={plans.isFetching}
        />
      </>
    );
  }

  if (plans.data.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="콜드체인을 볼 항차가 없습니다"
          description="공동적재 계획의 컨테이너 품온과 알림을 여기서 확인합니다."
        />
      </>
    );
  }

  const requested = searchParams.get('plan_id');
  const planId = plans.data.some(({ plan_id }) => plan_id === requested)
    ? (requested as string)
    : plans.data[0].plan_id;

  return (
    <>
      {header}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="m2-lbl">항차</span>
          <Select
            value={planId}
            onValueChange={next => router.replace(FORWARDER_PATHS.COLDCHAIN(next))}
          >
            <SelectTrigger className="w-96 max-w-full rounded-xl bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {plans.data.map(({ plan_id, vessel, departure }) => (
                <SelectItem key={plan_id} value={plan_id}>
                  {vessel ?? NO_VESSEL_LABEL} · 출항 {monthDayTime(departure)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href={FORWARDER_PATHS.PLAN(planId)} className="m2-btn m2-btn-sec m2-btn-sm">
            항차 상세
          </Link>
        </div>

        <PlanColdchain
          key={planId}
          planId={planId}
          containerParam={searchParams.get('container_id')}
        />
      </div>
    </>
  );
}

type PlanColdchainPropsT = {
  planId: string;
  containerParam: string | null;
};

function PlanColdchain({ planId, containerParam }: PlanColdchainPropsT) {
  const plan = useForwarderPlan(planId);
  const containers = useForwarderContainers(planId);
  const stream = useForwarderAlertStream(planId);

  const summaries = containers.data ?? [];
  const planContainerIds = (plan.data?.plan.containers ?? [])
    .filter(({ used }) => used)
    .map(({ container_id }) => container_id);
  const containerIds = [
    ...new Set([...planContainerIds, ...summaries.map(({ container_id }) => container_id)]),
  ];
  const containerId =
    containerParam && containerIds.includes(containerParam) ? containerParam : containerIds[0];
  const isLoading = plan.isPending || containers.isPending;
  const streamState = STREAM_LABEL[stream.state];
  const alerts = stream.alerts.filter(alert => alert.container_id === containerId);

  return (
    <div className="flex flex-col gap-4">
      {containers.isError && (
        <QueryError
          message="컨테이너 상태를 불러오지 못했습니다."
          onRetry={() => containers.refetch()}
          isRetrying={containers.isFetching}
        />
      )}

      <ContainerTiles
        planId={planId}
        containerIds={containerIds}
        summaries={summaries}
        activeId={containerId}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-4 max-[1180px]:grid-cols-1">
        <ContainerPanel planId={planId} containerId={containerId} isLoading={isLoading} />
        <section className="m2-card">
          <div className="m2-card-h">
            <h2 className="m2-h2">실시간 알림</h2>
            <span className={streamState.chip}>{streamState.label}</span>
            {stream.state === 'stopped' && (
              <button
                type="button"
                className="m2-btn m2-btn-sec m2-btn-sm"
                onClick={stream.reconnect}
              >
                다시 연결
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="m2-sub">아직 알림이 없습니다.</p>
          ) : (
            <ul className="flex max-h-96 flex-col overflow-y-auto">
              {alerts.map(({ seq, key, level, title, message, at }) => (
                <li
                  key={seq ?? key}
                  className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-2 border-t border-m2-line py-2.5 first:border-t-0"
                >
                  <time className="m2-num text-[12px] text-m2-muted">
                    {monthDayTime(at).slice(-5)}
                  </time>
                  <div className="min-w-0">
                    <p className={cn('text-[13px] font-semibold', ALERT_COLOR[level])}>
                      {withoutContainerPrefix(title)}
                    </p>
                    <p className="text-[12px] text-m2-muted">{message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <SectionErrorBoundary message="젯셋 사전 배정 후보를 그리지 못했습니다." className="h-48">
        <ColdchainGensetCandidates planId={planId} containerId={containerId} />
      </SectionErrorBoundary>
    </div>
  );
}

type ContainerPanelPropsT = {
  planId: string;
  containerId: string | undefined;
  isLoading: boolean;
};

function ContainerPanel({ planId, containerId, isLoading }: ContainerPanelPropsT) {
  if (containerId) {
    return (
      <SectionErrorBoundary message="품온 정보를 그리지 못했습니다." className="h-96">
        <ContainerTwin planId={planId} containerId={containerId} />
      </SectionErrorBoundary>
    );
  }

  if (isLoading) return <Skeleton className="h-96 rounded-[18px]" />;

  return (
    <div className="m2-card">
      <p className="m2-sub py-8 text-center">품온을 볼 컨테이너가 없습니다.</p>
    </div>
  );
}

type ContainerTilesPropsT = {
  planId: string;
  containerIds: string[];
  summaries: ForwarderTwinSummaryT[];
  activeId: string | undefined;
  isLoading: boolean;
};

function ContainerTiles({
  planId,
  containerIds,
  summaries,
  activeId,
  isLoading,
}: ContainerTilesPropsT) {
  if (isLoading) return <Skeleton className="h-24 rounded-[18px]" />;

  if (containerIds.length === 0) {
    return (
      <EmptyState
        title="이 항차에는 컨테이너가 없습니다"
        description="계획에 컨테이너가 배정되면 품온 측정이 시작됩니다."
      />
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2.5">
      {containerIds.map(id => (
        <ContainerTile
          key={id}
          planId={planId}
          containerId={id}
          summary={summaries.find(({ container_id }) => container_id === id) ?? null}
          isActive={id === activeId}
        />
      ))}
    </div>
  );
}

type ContainerTilePropsT = {
  planId: string;
  containerId: string;
  summary: ForwarderTwinSummaryT | null;
  isActive: boolean;
};

function ContainerTile({ planId, containerId, summary, isActive }: ContainerTilePropsT) {
  const status = TWIN_STATUS[summary?.status ?? 'no_data'];

  return (
    <Link
      href={FORWARDER_PATHS.COLDCHAIN(planId, containerId)}
      replace
      aria-current={isActive}
      className={cn(
        'm2-block flex flex-col gap-1.5 text-inherit no-underline',
        isActive && 'shadow-[0_0_0_2px_var(--m2-brand)]'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="m2-mono text-[13px] font-bold">{containerId}</span>
        <span className={cn(status.chip, 'ml-auto')}>{status.label}</span>
      </div>
      {summary && summary.reading_count > 0 ? (
        <p className="m2-num text-[12px] text-m2-muted">
          {typeof summary.temp_c === 'number' ? `${summary.temp_c}°C` : '–'} · 단전{' '}
          {formatMinutes(summary.cumulative_outage_minutes)}분 · 손실{' '}
          {formatPercent(summary.sensor_loss_rate)}
          {summary.open_actions > 0 && (
            <span className="ml-1 font-bold text-m2-berry">· 조치 {summary.open_actions}건</span>
          )}
        </p>
      ) : (
        <p className="text-[12px] text-m2-muted">아직 측정값이 없습니다.</p>
      )}
    </Link>
  );
}

function ContainerTwin({ planId, containerId }: { planId: string; containerId: string }) {
  const twin = useColdchainTwin(planId, containerId);

  if (twin.isPending) return <Skeleton className="h-96 rounded-[18px]" />;

  if (twin.isError) {
    return (
      <QueryError
        message={`${containerId} 품온 정보를 불러오지 못했습니다.`}
        onRetry={() => twin.refetch()}
        isRetrying={twin.isFetching}
      />
    );
  }

  const data = twin.data;

  return (
    <div className="flex flex-col gap-4">
      <section className="m2-card">
        <div className="m2-card-h flex-wrap">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m2-h2">{containerId} 품온 · 전원</h2>
            {data ? <TwinChips twin={data} /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[12px] text-m2-muted max-[1180px]:hidden">
              차트 위를 움직이면 시각별 품온
            </span>
            <ColdchainCsvButtons
              planId={planId}
              containerId={containerId}
              hasData={!!data?.has_data}
            />
          </div>
        </div>
        {data && data.has_data ? (
          <TwinBody twin={data} containerId={containerId} />
        ) : (
          <p className="m2-sub py-6 text-center">{NO_READING_TEXT}</p>
        )}
      </section>
      {data ? (
        <>
          <ColdchainActionList
            planId={planId}
            containerId={containerId}
            actions={data.actions}
            canAct
          />
          <ColdchainResidualRisks risks={data.residual_risks} />
        </>
      ) : null}
    </div>
  );
}
