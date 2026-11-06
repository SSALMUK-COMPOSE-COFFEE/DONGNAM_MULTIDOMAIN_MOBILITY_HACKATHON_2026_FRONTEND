'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useForwarderPlan } from '@/apis/saas/forwarder';
import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import {
  EmptyState,
  QueryError,
  errorStatus,
} from '@/app/(saas)/app/forwarder/_components/query-state';
import { useForwarderOrgName } from '@/app/(saas)/app/forwarder/_components/use-org-name';
import { VoyageExecution } from '@/app/(saas)/app/forwarder/_components/voyage-execution';
import { Skeleton } from '@/components/ui/skeleton';

export function PlanDetailView() {
  const planId = useSearchParams().get('plan_id') ?? '';
  const orgName = useForwarderOrgName();
  const plan = useForwarderPlan(planId);
  const eyebrow = (
    <>
      <Link href={FORWARDER_PATHS.HOME} className="text-inherit hover:text-m2-ink">
        배정 항차
      </Link>
      {orgName ? ` · ${orgName}` : ''}
    </>
  );

  if (!planId) {
    return (
      <>
        <ForwarderPageHeader eyebrow={eyebrow} title="항차 실행" />
        <EmptyState
          title="볼 항차를 고르세요"
          description="배정된 항차 목록에서 항차를 선택하면 집하 경로와 실행 지시가 열립니다."
          action={{ href: FORWARDER_PATHS.HOME, label: '항차 목록으로' }}
        />
      </>
    );
  }

  if (plan.isPending) {
    return (
      <div aria-busy className="flex flex-col gap-4">
        <Skeleton className="h-16 w-2/3 rounded-xl" />
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-[500px] rounded-[18px]" />
        <div className="grid grid-cols-2 gap-4 max-[1180px]:grid-cols-1">
          <Skeleton className="h-96 rounded-[18px]" />
          <Skeleton className="h-96 rounded-[18px]" />
        </div>
      </div>
    );
  }

  if (plan.isError) {
    const status = errorStatus(plan.error);

    return (
      <>
        <ForwarderPageHeader eyebrow={eyebrow} title="항차 실행" />
        {status === 404 || status === 403 ? (
          <EmptyState
            title="배정되지 않았거나 없는 항차입니다"
            description="이 계획을 조회할 수 없거나 계획이 삭제되었습니다. 목록에서 다시 고르세요."
            action={{ href: FORWARDER_PATHS.HOME, label: '항차 목록으로' }}
          />
        ) : (
          <QueryError
            message="항차를 불러오지 못했습니다. 서버 연결을 확인하세요."
            onRetry={() => plan.refetch()}
            isRetrying={plan.isFetching}
          />
        )}
      </>
    );
  }

  return <VoyageExecution key={planId} session={plan.data} eyebrow={eyebrow} />;
}
