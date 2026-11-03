'use client';

import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { usePlatformPlan } from '@/apis/saas/platform';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { PLATFORM_PATHS, readPlanQuery } from '@/app/(saas)/app/platform/_components/paths';
import { PlanStatusBadge } from '@/app/(saas)/app/platform/_components/plan-status-badge';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { ForwarderAssignCard } from '@/app/(saas)/app/platform/plans/detail/_components/forwarder-assign-card';
import { ReplanSection } from '@/app/(saas)/app/platform/plans/detail/_components/replan-section';
import { PlanDetail } from '@/components/plan-detail';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatKstMonthDayTime } from '@/utils/kst';

export function PlanDetailView() {
  const planId = readPlanQuery(useSearchParams()) ?? '';
  const { data: session, isPending, isError, error, refetch, isFetching } = usePlatformPlan(planId);

  if (!planId || (isError && isAxiosError(error) && error.response?.status === 404)) {
    return (
      <EmptyState title="계획을 찾을 수 없습니다" description="지워졌거나 다른 조직의 계획입니다.">
        <Button asChild variant="outline">
          <Link href={PLATFORM_PATHS.PLANS}>계획 목록으로</Link>
        </Button>
      </EmptyState>
    );
  }
  if (isError) {
    return (
      <QueryError
        error={error}
        subject="운송계획을"
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }
  if (isPending) return <Skeleton className="h-96" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <PlanStatusBadge status={session.status} />
        <span className="text-muted-foreground">
          버전 <span className="num">{session.version}</span> · 갱신{' '}
          <span className="num">{formatKstMonthDayTime(session.updated_at)}</span>
        </span>
        <div className="ml-auto flex gap-2">
          <Button asChild variant="outline">
            <Link href={PLATFORM_PATHS.COLDCHAIN_OF(planId)}>콜드체인 관제</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={PLATFORM_PATHS.PLANS}>목록</Link>
          </Button>
        </div>
      </div>

      <ForwarderAssignCard planId={planId} />

      <SectionErrorBoundary message="계획 상세를 그리지 못했습니다." className="h-96">
        <PlanDetail session={session} isResponsive showAirLots />
      </SectionErrorBoundary>

      <SectionErrorBoundary message="재최적화 영역을 그리지 못했습니다." className="h-64">
        <ReplanSection key={session.plan_id} session={session} />
      </SectionErrorBoundary>
    </div>
  );
}
