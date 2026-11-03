'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import { useShipperPlans } from '@/apis/saas/shipper';
import { PLAN_STATUS_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtMonthDayTime } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { useShipperTasks } from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

export function PlansView() {
  const plans = useShipperPlans();
  const { confirmations } = useShipperTasks();
  const pendingPlanIds = new Set(confirmations.map(({ plan }) => plan.plan_id));

  if (plans.isError) {
    return (
      <QueryError
        message="운송계획 목록을 불러오지 못했습니다."
        onRetry={() => plans.refetch()}
        isRetrying={plans.isFetching}
      />
    );
  }
  if (plans.isPending) return <CardSkeleton height={360} />;

  return (
    <section className="m2-card" aria-label="계획 목록">
      <div className="m2-card-h">
        <h2 className="m2-h2">
          내 출하가 들어간 계획{' '}
          <span className="m2-num text-m2-brand-ink">{plans.data.length}</span>건
        </h2>
      </div>
      {plans.data.length === 0 ? (
        <EmptyState
          title="아직 들어간 운송계획이 없습니다"
          description="출하를 등록하면 플랫폼이 다른 화주 출하와 묶어 계획을 만듭니다."
          action={{ href: SHIPPER_PATHS.LOTS, label: '출하 등록하기' }}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="m2-table">
            <thead>
              <tr>
                <th>선박</th>
                <th>출항</th>
                <th>상태</th>
                <th className="r">내 출하</th>
                <th className="r">내 팔레트 / 전체</th>
                <th>만든 시각</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plans.data.map(
                ({
                  plan_id,
                  vessel,
                  departure,
                  status,
                  my_lot_ids,
                  my_pallets,
                  total_pallets,
                  created_at,
                }) => (
                  <tr key={plan_id}>
                    <td className="font-semibold">{vessel ?? NO_VESSEL_LABEL}</td>
                    <td className="m2-num">{fmtMonthDayTime(departure)}</td>
                    <td>
                      {pendingPlanIds.has(plan_id) ? (
                        <span className="m2-chip m2-chip-brand">확정 대기</span>
                      ) : (
                        <span
                          className={
                            status === 'committed' ? 'm2-chip m2-chip-ok' : 'm2-chip m2-chip-warn'
                          }
                        >
                          {PLAN_STATUS_LABEL[status] ?? status}
                        </span>
                      )}
                    </td>
                    <td className="r m2-num">{my_lot_ids.length}건</td>
                    <td className="r m2-num">
                      <b className="font-semibold">{my_pallets}</b>
                      <span className="text-m2-muted"> / {total_pallets}</span>
                    </td>
                    <td className="m2-num text-m2-muted">{fmtMonthDayTime(created_at)}</td>
                    <td className="r">
                      <Link
                        href={SHIPPER_PATHS.PLAN(plan_id)}
                        className="m2-btn m2-btn-sec m2-btn-sm"
                      >
                        {pendingPlanIds.has(plan_id) ? '확정하러 가기' : '상세'}
                        <ArrowRightIcon size={14} />
                      </Link>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
