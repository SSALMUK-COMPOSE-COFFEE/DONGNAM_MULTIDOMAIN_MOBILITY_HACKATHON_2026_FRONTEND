'use client';

import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'sonner';

import {
  postShipperOrderConfirm,
  useInvalidateShipperPlan,
  useShipperCatalog,
  useShipperPlan,
  useShipperPlanOrders,
} from '@/apis/saas/shipper';
import {
  viewerShipperIdOf,
  withLocatedPackhouses,
} from '@/app/(saas)/app/shipper/_components/catalog';
import { PLAN_STATUS_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import {
  EmptyState,
  QueryError,
  errorStatus,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { RequestList } from '@/app/(saas)/app/shipper/_components/request-list';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { ExecutionOrderPanel } from '@/components/execution-order';
import { PlanDetail } from '@/components/plan-detail';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { UseConfirmOrderOptionsT } from '@/hooks/useConfirmOrder';
import type { ShipperOrderT } from '@/types/saas-shipper';
import { planSessionLabel } from '@/utils/plan-label';

export function PlanDetailView() {
  const planId = useSearchParams().get('plan_id') ?? '';
  const plan = useShipperPlan(planId);
  const session = useMemo(() => plan.data && withLocatedPackhouses(plan.data), [plan.data]);
  const catalog = useShipperCatalog();
  const viewerShipperId = viewerShipperIdOf(catalog.data);
  const backLink = (
    <Link
      href={SHIPPER_PATHS.PLANS}
      className={buttonVariants({ variant: 'ghost', className: 'self-start' })}
    >
      <ArrowLeftIcon />
      계획 목록
    </Link>
  );

  if (!planId) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <EmptyState
          title="볼 계획을 고르세요"
          description="운송계획 목록에서 계획을 선택하면 상세가 열립니다."
          action={{ href: SHIPPER_PATHS.PLANS, label: '계획 목록으로' }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      {errorStatus(plan.error) === 404 && (
        <EmptyState
          title="계획을 찾을 수 없습니다"
          description="내 출하가 들어간 계획이 아니거나 지워진 계획입니다."
          action={{ href: SHIPPER_PATHS.PLANS, label: '계획 목록으로' }}
        />
      )}
      {plan.isError && errorStatus(plan.error) !== 404 && (
        <QueryError
          message="운송계획을 불러오지 못했습니다. 서버 연결을 확인하세요."
          onRetry={() => plan.refetch()}
          isRetrying={plan.isFetching}
        />
      )}
      {(plan.isPending || catalog.isPending) && !plan.isError && !catalog.isError && (
        <Skeleton className="h-96" />
      )}
      {catalog.isError && (
        <QueryError
          message="내 화주 정보를 불러오지 못했습니다."
          onRetry={() => catalog.refetch()}
          isRetrying={catalog.isFetching}
        />
      )}

      {plan.data && session && catalog.data && (
        <>
          <div className="flex items-center gap-3">
            <Badge variant={plan.data.status === 'committed' ? 'default' : 'secondary'}>
              {PLAN_STATUS_LABEL[plan.data.status]}
            </Badge>
            <span className="text-sm num text-muted-foreground">
              {planSessionLabel(plan.data)} · v{plan.data.version}
            </span>
            <span className="text-sm text-muted-foreground">다른 화주는 익명으로 보입니다</span>
          </div>

          <SectionErrorBoundary message="운송계획을 그리지 못했습니다." className="h-96">
            <PlanDetail
              session={session}
              viewerShipperId={viewerShipperId}
              isResponsive
              showAirLots
            />
          </SectionErrorBoundary>

          <SectionErrorBoundary message="실행 지시를 그리지 못했습니다." className="h-64">
            <PlanOrders planId={plan.data.plan_id} viewerShipperId={viewerShipperId} />
          </SectionErrorBoundary>
        </>
      )}
    </div>
  );
}

function PlanOrders({ planId, viewerShipperId }: { planId: string; viewerShipperId: string }) {
  const orders = useShipperPlanOrders(planId);

  if (orders.isError) {
    return (
      <QueryError
        message="실행 지시를 불러오지 못했습니다."
        onRetry={() => orders.refetch()}
        isRetrying={orders.isFetching}
      />
    );
  }
  if (orders.isPending) return <Skeleton className="h-64" />;

  const latestFirst = [...orders.data].reverse();
  const requestItems = latestFirst.flatMap(order =>
    order.requests.map(request => ({ planId, order, request }))
  );

  return (
    <div className="flex flex-col gap-6">
      {latestFirst.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>실행 지시</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="확인할 실행 지시가 없습니다"
              description="취소·항공 전환으로 계획이 바뀌면 여기서 수락합니다."
            />
          </CardContent>
        </Card>
      ) : (
        latestFirst.map(order => (
          <ShipperOrderPanel
            key={order.order_id}
            planId={planId}
            order={order}
            viewerShipperId={viewerShipperId}
          />
        ))
      )}

      <Card>
        <CardHeader>
          <CardTitle>요청 응답</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestList items={requestItems} emptyText="내 출하와 관련된 요청이 없습니다." />
        </CardContent>
      </Card>
    </div>
  );
}

function ShipperOrderPanel({
  planId,
  order,
  viewerShipperId,
}: {
  planId: string;
  order: ShipperOrderT;
  viewerShipperId: string;
}) {
  const invalidatePlan = useInvalidateShipperPlan();
  const confirmOptions: UseConfirmOrderOptionsT = {
    confirmFn: ({ accept, note, shipper_id }) =>
      postShipperOrderConfirm(planId, order.order_id, {
        accept,
        note: note ?? null,
        shipper_id: shipper_id ?? null,
      }),
    onSuccess: (_updated, { accept }) => {
      invalidatePlan(planId);
      toast.success(accept ? '실행 지시를 수락했습니다.' : '실행 지시를 거절했습니다.');
    },
  };

  return (
    <ExecutionOrderPanel
      planId={planId}
      order={order}
      role="shipper"
      viewerShipperId={viewerShipperId}
      confirmOptions={confirmOptions}
    />
  );
}
