'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import { useShipperCatalog, useShipperLots } from '@/apis/saas/shipper';
import { LOT_STATUS_LABEL, PLAN_STATUS_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import { EmptyState, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { useShipperTasks } from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ShipperCatalogT, ShipperLotT, ShipperPlanItemT } from '@/types/saas-shipper';
import { formatMonthDay, formatMonthDayTime } from '@/utils/format';
import { getProductName } from '@/utils/scenario';

const RECENT_LOT_COUNT = 5;

export function ShipperHomeView() {
  const lots = useShipperLots();
  const catalog = useShipperCatalog();
  const tasks = useShipperTasks();

  return (
    <div className="flex flex-col gap-6">
      <LotSummary lots={lots.data} isError={lots.isError} />

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        <NextPlanCard
          plans={tasks.plans.data}
          isError={tasks.plans.isError}
          isRetrying={tasks.plans.isFetching}
          onRetry={() => tasks.plans.refetch()}
        />
        <TaskCard
          confirmations={tasks.confirmations.length}
          requests={tasks.requests.length}
          isLoading={tasks.plans.isPending || tasks.isOrdersLoading}
          isError={tasks.plans.isError || tasks.isOrdersError}
          isRetrying={tasks.isOrdersFetching}
          onRetry={() => tasks.refetchOrders()}
        />
      </div>

      <RecentLots
        lots={lots.data}
        catalog={catalog.data}
        isError={lots.isError}
        isRetrying={lots.isFetching}
        onRetry={() => lots.refetch()}
      />
    </div>
  );
}

function LotSummary({
  lots,
  isError,
}: {
  lots: ShipperLotT[] | null | undefined;
  isError: boolean;
}) {
  const stats = (['registered', 'planned', 'shipped'] as const).map(status => {
    const matched = (lots ?? []).filter(lot => lot.status === status);

    return {
      status,
      count: matched.length,
      pallets: matched.reduce((sum, { pallets }) => sum + pallets, 0),
    };
  });

  return (
    <div className="grid grid-cols-3 gap-6">
      {stats.map(({ status, count, pallets }) => (
        <Card key={status}>
          <CardContent className="flex flex-col gap-2">
            <span className="text-sm font-bold text-muted-foreground">
              {LOT_STATUS_LABEL[status]} 출하
            </span>
            {lots ? (
              <p className="text-3xl font-black text-navy">
                <span className="num">{count}</span>건
                <span className="ml-3 text-lg font-bold text-muted-foreground">
                  <span className="num">{pallets}</span>파렛트
                </span>
              </p>
            ) : (
              <Skeleton className="h-9 w-32" />
            )}
            {isError && <span className="text-sm text-destructive">불러오지 못했습니다</span>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const nextPlanOf = (plans: ShipperPlanItemT[]) => {
  const now = Date.now();
  const upcoming = plans
    .filter(({ departure }) => departure && new Date(departure).getTime() >= now)
    .sort((a, b) => (a.departure ?? '').localeCompare(b.departure ?? ''));

  return upcoming[0] ?? plans[0] ?? null;
};

function NextPlanCard({
  plans,
  isError,
  isRetrying,
  onRetry,
}: {
  plans: ShipperPlanItemT[] | undefined;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  if (isError) {
    return (
      <QueryError
        message="운송계획을 불러오지 못했습니다."
        onRetry={onRetry}
        isRetrying={isRetrying}
      />
    );
  }

  const next = plans ? nextPlanOf(plans) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>다음 운송계획</CardTitle>
      </CardHeader>
      <CardContent>
        {!plans && <Skeleton className="h-32" />}
        {plans && !next && (
          <EmptyState
            title="아직 들어간 운송계획이 없습니다"
            description="플랫폼이 출하를 묶어 계획을 만들면 여기에 나옵니다."
          />
        )}
        {next && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <p className="text-2xl font-black text-navy">{next.vessel ?? '선박 미정'}</p>
              <Badge variant={next.status === 'committed' ? 'default' : 'secondary'}>
                {PLAN_STATUS_LABEL[next.status]}
              </Badge>
            </div>
            <p className="flex gap-8 text-muted-foreground">
              <span>
                출항{' '}
                <span className="font-bold num text-foreground">
                  {formatMonthDayTime(next.departure)}
                </span>
              </span>
              <span>
                내 파렛트{' '}
                <span className="font-bold num text-foreground">
                  {next.my_pallets}/{next.total_pallets}
                </span>
              </span>
            </p>
            <Link
              href={SHIPPER_PATHS.PLAN(next.plan_id)}
              className={buttonVariants({ className: 'self-start' })}
            >
              계획 상세 보기
              <ArrowRightIcon />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskCard({
  confirmations,
  requests,
  isLoading,
  isError,
  isRetrying,
  onRetry,
}: {
  confirmations: number;
  requests: number;
  isLoading: boolean;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>확인할 일</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading && !isError && <Skeleton className="h-24" />}
        {isError && (
          <QueryError
            message="실행 지시를 불러오지 못했습니다."
            onRetry={onRetry}
            isRetrying={isRetrying}
          />
        )}
        {!isLoading && !isError && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <TaskStat label="확정할 실행 지시" count={confirmations} />
              <TaskStat label="응답할 요청" count={requests} />
            </div>
            <Link
              href={SHIPPER_PATHS.REQUESTS}
              className={buttonVariants({ variant: 'outline', className: 'self-start' })}
            >
              요청 응답으로
              <ArrowRightIcon />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TaskStat({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-panel px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={count > 0 ? 'text-3xl font-black text-berry' : 'text-3xl font-black text-navy'}
      >
        <span className="num">{count}</span>건
      </span>
    </div>
  );
}

function RecentLots({
  lots,
  catalog,
  isError,
  isRetrying,
  onRetry,
}: {
  lots: ShipperLotT[] | undefined;
  catalog: ShipperCatalogT | undefined;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  if (isError) {
    return (
      <QueryError message="출하를 불러오지 못했습니다." onRetry={onRetry} isRetrying={isRetrying} />
    );
  }

  const recent = [...(lots ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, RECENT_LOT_COUNT);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          최근 등록한 출하
          <Link
            href={SHIPPER_PATHS.LOTS}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'ml-auto' })}
          >
            출하 등록 · 목록
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!lots && <Skeleton className="h-40" />}
        {lots && recent.length === 0 && (
          <EmptyState
            title="등록한 출하가 없습니다"
            description="품목·수량·선과장·목적지·출하일 다섯 가지만 넣으면 됩니다."
            action={{ href: SHIPPER_PATHS.LOTS, label: '출하 등록하기' }}
          />
        )}
        {recent.length > 0 && (
          <ul className="flex flex-col divide-y">
            {recent.map(({ id, product_id, pallets, ready_date, status }) => (
              <li key={id} className="flex items-center gap-4 py-3">
                <span className="font-bold num">{id}</span>
                <span className="text-muted-foreground">
                  {catalog ? getProductName(catalog, product_id) : product_id}
                </span>
                <span className="num">{pallets}파렛트</span>
                <span className="num text-muted-foreground">출하 {formatMonthDay(ready_date)}</span>
                <Badge variant="secondary" className="ml-auto">
                  {LOT_STATUS_LABEL[status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
