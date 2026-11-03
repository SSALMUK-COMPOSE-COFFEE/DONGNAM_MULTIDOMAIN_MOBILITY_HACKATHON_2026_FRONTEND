'use client';

import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useForwarderPlan, useForwarderPlanOrders } from '@/apis/saas/forwarder';
import { ForwarderOrderPanel } from '@/app/(saas)/app/forwarder/_components/forwarder-order-panel';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import { PLAN_STATUS_LABEL, latestOrder } from '@/app/(saas)/app/forwarder/_components/labels';
import { PickupSchedule } from '@/app/(saas)/app/forwarder/_components/pickup-schedule';
import {
  EmptyState,
  QueryError,
  errorStatus,
} from '@/app/(saas)/app/forwarder/_components/query-state';
import { ContainerCard } from '@/components/plan-detail/container-card';
import { PickupMap } from '@/components/plan-detail/pickup-map';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ForwarderPlanSessionT } from '@/types/saas-forwarder';
import { formatKstMonthDayTime } from '@/utils/kst';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

const firstVoyage = ({ plan, scenario }: ForwarderPlanSessionT) => {
  const used = new Set(
    plan.containers.filter(({ used }) => used).map(({ voyage_id }) => voyage_id)
  );

  return (
    scenario.voyages
      .filter(({ id }) => used.has(id))
      .sort((a, b) => a.etd.localeCompare(b.etd))[0] ?? null
  );
};

export function PlanDetailView() {
  const planId = useSearchParams().get('plan_id') ?? '';
  const plan = useForwarderPlan(planId);
  const backLink = (
    <Link
      href={FORWARDER_PATHS.HOME}
      className={buttonVariants({ variant: 'ghost', className: 'self-start' })}
    >
      <ArrowLeftIcon />
      배정된 항차
    </Link>
  );

  if (!planId) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <EmptyState
          title="볼 항차를 고르세요"
          description="배정된 항차 목록에서 항차를 선택하면 집하 경로와 실행 지시가 열립니다."
          action={{ href: FORWARDER_PATHS.HOME, label: '항차 목록으로' }}
        />
      </div>
    );
  }

  if (plan.isPending) {
    return (
      <div aria-busy className="flex flex-col gap-6">
        {backLink}
        <Skeleton className="h-24" />
        <div className="grid grid-cols-[1fr_560px] gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (plan.isError) {
    const status = errorStatus(plan.error);

    return (
      <div className="flex flex-col gap-6">
        {backLink}
        {status === 404 || status === 403 ? (
          <EmptyState
            title="배정되지 않았거나 없는 항차입니다"
            description="플랫폼이 배정을 해제했을 수 있습니다. 목록에서 다시 고르세요."
            action={{ href: FORWARDER_PATHS.HOME, label: '항차 목록으로' }}
          />
        ) : (
          <QueryError
            message="항차를 불러오지 못했습니다. 서버 연결을 확인하세요."
            onRetry={() => plan.refetch()}
            isRetrying={plan.isFetching}
          />
        )}
      </div>
    );
  }

  const session = plan.data;
  const voyage = firstVoyage(session);
  const usedContainers = session.plan.containers.filter(({ used }) => used).length;
  const pallets = session.plan.assignments.reduce((sum, { pallets }) => sum + pallets, 0);

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <div className="flex flex-wrap items-center gap-6 rounded-3xl bg-navy px-10 py-7 text-white">
        <p className="text-3xl font-bold">
          {voyage?.vessel_name ?? NO_VESSEL_LABEL}
          <span className="mx-4">·</span>
          출항 <span className="num text-cyan">{formatKstMonthDayTime(voyage?.etd)}</span>
          <span className="mx-4">·</span>
          CY 마감 <span className="num">{formatKstMonthDayTime(voyage?.cy_cutoff)}</span>
        </p>
        <div className="ml-auto flex items-center gap-3">
          <Badge variant="secondary">{PLAN_STATUS_LABEL[session.status]}</Badge>
          <span className="text-sm num text-white/70">
            컨테이너 {usedContainers}대 · {pallets}파렛트 · v{session.version}
          </span>
          <Link
            href={FORWARDER_PATHS.COLDCHAIN(session.plan_id)}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            콜드체인 보기
          </Link>
        </div>
      </div>

      <CurrentOrder planId={session.plan_id} />

      <div className="grid grid-cols-[1fr_560px] gap-6">
        <ContainerCard plan={session.plan} scenario={session.scenario} showAirLots />
        <PickupMap scenario={session.scenario} voyagePickups={session.routes} />
      </div>

      <SectionErrorBoundary message="집하 순서를 그리지 못했습니다." className="h-40">
        <PickupSchedule session={session} />
      </SectionErrorBoundary>
    </div>
  );
}

function CurrentOrder({ planId }: { planId: string }) {
  const orders = useForwarderPlanOrders(planId);

  if (orders.isPending) return <Skeleton className="h-64" />;

  if (orders.isError) {
    return (
      <QueryError
        message="실행 지시를 불러오지 못했습니다."
        onRetry={() => orders.refetch()}
        isRetrying={orders.isFetching}
      />
    );
  }

  const order = latestOrder(orders.data);

  if (!order) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>실행 지시</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            지금 확정할 실행 지시가 없습니다. 계획이 바뀌면 플랫폼이 실행 지시를 보냅니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ForwarderOrderPanel planId={planId} order={order} />;
}
