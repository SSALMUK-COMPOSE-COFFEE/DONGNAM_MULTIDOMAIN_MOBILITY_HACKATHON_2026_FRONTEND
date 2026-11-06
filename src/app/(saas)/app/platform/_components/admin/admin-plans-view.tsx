'use client';

import Link from 'next/link';

import { PLATFORM_PLANS_LIMIT, usePlatformPlans } from '@/apis/saas/platform';
import { capOf } from '@/apis/saas/polling';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { PLATFORM_PATHS } from '@/app/(saas)/app/platform/_components/paths';
import { PlanStatusBadge } from '@/app/(saas)/app/platform/_components/plan-status-badge';
import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatKstMonthDayTime } from '@/utils/kst';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

export function AdminPlansView() {
  const query = usePlatformPlans();
  const cap = capOf(query.data ?? null, PLATFORM_PLANS_LIMIT);

  return (
    <>
      <PlatformHeader
        eyebrow="서비스 관리 · 운송계획"
        title="운송계획 조회"
        sub="포워더가 생성한 계획의 배정 결과와 진행 상태를 확인합니다."
      />
      <section className="m2-card">
        <div className="m2-card-h">
          <h2 className="m2-h2">운송계획</h2>
          {cap.isCapped ? (
            <span className="m2-chip m2-chip-warn">최근 {cap.limit.toLocaleString('ko-KR')}건</span>
          ) : null}
        </div>
        {query.isError ? (
          <QueryError
            subject="운송계획을"
            error={query.error}
            onRetry={() => query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : null}
        {query.isPending ? <Skeleton className="h-64 rounded-xl" /> : null}
        {query.data?.length === 0 ? (
          <EmptyState
            title="등록된 운송계획이 없습니다"
            description="포워더가 계획을 생성하면 여기에 표시됩니다."
          />
        ) : null}
        {query.data?.length ? (
          <div className="overflow-x-auto">
            <table className="m2-table">
              <thead>
                <tr>
                  <th>선박</th>
                  <th>출항</th>
                  <th>담당 포워더</th>
                  <th className="r">화주</th>
                  <th className="r">파렛트</th>
                  <th>상태</th>
                  <th>생성 시각</th>
                  <th>
                    <span className="sr-only">계획 상세</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.map(plan => (
                  <tr key={plan.plan_id}>
                    <td className="font-semibold">{plan.vessel ?? NO_VESSEL_LABEL}</td>
                    <td className="m2-num">{formatKstMonthDayTime(plan.departure)}</td>
                    <td>{plan.forwarder?.org_name ?? '미배정'}</td>
                    <td className="r m2-num">{plan.shipper_count}곳</td>
                    <td className="r m2-num">{plan.total_pallets}</td>
                    <td>
                      <PlanStatusBadge status={plan.status} />
                    </td>
                    <td className="m2-num text-m2-muted">
                      {formatKstMonthDayTime(plan.created_at)}
                    </td>
                    <td>
                      <Link
                        href={PLATFORM_PATHS.PLAN(plan.plan_id)}
                        className="m2-btn m2-btn-sec m2-btn-sm"
                      >
                        상세 조회
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  );
}
