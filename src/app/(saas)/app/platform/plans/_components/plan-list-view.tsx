'use client';

import Link from 'next/link';

import { usePlatformPlans } from '@/apis/saas/platform';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { PLATFORM_PATHS } from '@/app/(saas)/app/platform/_components/paths';
import { PlanStatusBadge } from '@/app/(saas)/app/platform/_components/plan-status-badge';
import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { formatKstMonthDayTime } from '@/utils/kst';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

export function PlanListView() {
  const { data: plans, isPending, isError, error, refetch, isFetching } = usePlatformPlans();
  const unassigned = plans?.filter(({ forwarder }) => !forwarder).length ?? 0;

  return (
    <>
      <PlatformHeader
        eyebrow="공동적재 계획 · 목록"
        title="항차별 공동적재 계획과 포워더 배정"
        sub={
          plans
            ? `계획 ${plans.length}개 · 포워더 미배정 ${unassigned}개`
            : '만든 계획을 항차별로 모아 봅니다.'
        }
      >
        <Link href={PLATFORM_PATHS.HOME} className="m2-btn m2-btn-pri">
          새 계획
        </Link>
      </PlatformHeader>

      <section className="m2-card">
        <div className="m2-card-h">
          <h2 className="m2-h2">공동적재 계획</h2>
        </div>
        {isError && (
          <QueryError
            error={error}
            subject="계획 목록을"
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        )}
        {isPending && <Skeleton className="h-72 rounded-[14px]" />}
        {plans?.length === 0 && (
          <EmptyState
            title="아직 만든 계획이 없습니다"
            description="출하 풀에서 출하를 골라 공동적재 계획을 만드세요."
          >
            <Link href={PLATFORM_PATHS.HOME} className="m2-btn m2-btn-sec">
              출하 풀로
            </Link>
          </EmptyState>
        )}
        {!!plans?.length && (
          <div className="-mx-2.5 overflow-x-auto px-2.5">
            <table className="m2-table">
              <thead>
                <tr>
                  <th>선박</th>
                  <th>출항</th>
                  <th className="r">화주</th>
                  <th className="r">파렛트</th>
                  <th>상태</th>
                  <th>포워더</th>
                  <th>만든 시각</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr key={plan.plan_id}>
                    <td className="font-semibold">{plan.vessel ?? NO_VESSEL_LABEL}</td>
                    <td className="m2-num">{formatKstMonthDayTime(plan.departure)}</td>
                    <td className="r m2-num">{plan.shipper_count}곳</td>
                    <td className="r m2-num font-bold">{plan.total_pallets}</td>
                    <td>
                      <PlanStatusBadge status={plan.status} />
                    </td>
                    <td>
                      {plan.forwarder ? (
                        plan.forwarder.org_name
                      ) : (
                        <span className="m2-chip m2-chip-warn">미배정</span>
                      )}
                    </td>
                    <td className="m2-num text-m2-muted">
                      {formatKstMonthDayTime(plan.created_at)}
                    </td>
                    <td className="r">
                      <Link
                        href={PLATFORM_PATHS.PLAN(plan.plan_id)}
                        className="m2-btn m2-btn-sec m2-btn-sm"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
