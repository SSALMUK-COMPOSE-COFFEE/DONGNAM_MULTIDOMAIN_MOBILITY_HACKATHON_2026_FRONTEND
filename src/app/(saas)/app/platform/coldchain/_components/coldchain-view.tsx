'use client';

import { cn } from 'cn';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  type AlertStreamStatusT,
  usePlanContainerTwin,
  usePlanContainers,
  usePlatformAlertStream,
  usePlatformPlan,
  usePlatformPlans,
} from '@/apis/saas/platform';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { ActionList } from '@/components/action-list';
import { AlertFeed } from '@/components/alert-feed';
import { SensorStatusCard } from '@/components/sensor-status-card';
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
import { Skeleton } from '@/components/ui/skeleton';
import type { AlertT } from '@/types/api';
import type { TwinSummaryT } from '@/types/saas-platform';
import { formatMonthDayTime, formatPercent } from '@/utils/format';

const PLAN_QUERY = 'plan';

const STATUS_STYLE: Record<TwinSummaryT['status'], { label: string; className: string }> = {
  no_data: { label: '측정값 없음', className: 'bg-slate' },
  normal: { label: '정상', className: 'bg-ok' },
  warning: { label: '경고', className: 'bg-air' },
  critical: { label: '위험', className: 'bg-berry' },
};

const STREAM_LABEL: Record<AlertStreamStatusT, { label: string; className: string }> = {
  connecting: { label: '연결 중', className: 'bg-slate' },
  open: { label: '실시간 연결', className: 'bg-ok' },
  reconnecting: { label: '다시 연결 중', className: 'bg-air' },
  stopped: { label: '연결 끊김', className: 'bg-berry' },
};

export function ColdchainView() {
  const plansQuery = usePlatformPlans();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const planId = searchParams.get(PLAN_QUERY) ?? plansQuery.data?.[0]?.plan_id ?? '';

  const selectPlan = (nextPlanId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(PLAN_QUERY, nextPlanId);
    router.replace(`${pathname}?${params}`);
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
  if (plansQuery.isPending) return <Skeleton className="h-96" />;
  if (!planId) {
    return (
      <EmptyState
        title="관제할 계획이 없습니다"
        description="공동적재 계획을 만들면 컨테이너별 품온 · 전원을 볼 수 있습니다."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="font-bold">계획</span>
        <Select value={planId} onValueChange={selectPlan}>
          <SelectTrigger className="w-96">
            <SelectValue placeholder="계획 선택" />
          </SelectTrigger>
          <SelectContent>
            {plansQuery.data.map(({ plan_id, vessel, departure }) => (
              <SelectItem key={plan_id} value={plan_id}>
                {vessel ?? plan_id} · {formatMonthDayTime(departure)} 출항
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
  const summariesQuery = usePlanContainers(planId);
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
  if (planQuery.isPending) return <Skeleton className="h-96" />;

  return (
    <div className="flex flex-col gap-6">
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
        <div className="grid grid-cols-4 gap-4">
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
        <div className="grid grid-cols-[1fr_440px] gap-6">
          <ContainerTwin planId={planId} containerId={containerId} />
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              알림 스트림 <Badge className={stream.className}>{stream.label}</Badge>
              {status === 'stopped' && (
                <Button size="sm" variant="outline" onClick={reconnect}>
                  다시 연결
                </Button>
              )}
            </div>
            <AlertFeed alerts={alerts.filter(alert => alert.container_id === containerId)} />
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
        'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left hover:bg-panel',
        isActive && 'ring-2 ring-brand'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold">{containerId}</span>
        <Badge className={style.className}>{style.label}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 text-sm">
        <dt className="text-muted-foreground">품온</dt>
        <dd className="text-right font-bold num">
          {typeof summary?.temp_c === 'number' ? `${summary.temp_c}℃` : '–'}
        </dd>
        <dt className="text-muted-foreground">누적 단전</dt>
        <dd className="text-right font-bold num">{summary?.cumulative_outage_minutes ?? 0}분</dd>
        <dt className="text-muted-foreground">센서 손실률</dt>
        <dd className="text-right font-bold num">{formatPercent(summary?.sensor_loss_rate)}</dd>
        <dt className="text-muted-foreground">열린 조치</dt>
        <dd className="text-right font-bold num">{summary?.open_actions ?? 0}건</dd>
      </dl>
    </button>
  );
}

function ContainerTwin({ planId, containerId }: { planId: string; containerId: string }) {
  const twinQuery = usePlanContainerTwin(planId, containerId);
  const twin = twinQuery.data ?? null;

  return (
    <div className="flex flex-col gap-6">
      {twinQuery.isError && !twin && (
        <QueryError
          error={twinQuery.error}
          subject="센서 측정값을"
          onRetry={() => twinQuery.refetch()}
          isRetrying={twinQuery.isFetching}
        />
      )}
      {twinQuery.isPending ? (
        <Skeleton className="h-96" />
      ) : (
        <SensorStatusCard containerId={containerId} twin={twin} />
      )}
      {twin ? (
        <ActionList actions={twin.actions} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>자동 조치</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              기기 관리에서 센서를 이 컨테이너에 연결하면 측정값과 조치가 들어옵니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
