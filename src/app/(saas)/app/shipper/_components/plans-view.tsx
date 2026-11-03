'use client';

import { cn } from 'cn';
import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import { useShipperPlans, useShipperSettlements } from '@/apis/saas/shipper';
import { isReplanPending, useShipperPlanConfirmations } from '@/apis/saas/shipper-confirm';
import { PLAN_STATUS_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import {
  CARD_HIDE,
  CARD_MAIN,
  CARD_PUSH,
  CARD_TABLE,
  MOBILE_BLOCK,
} from '@/app/(saas)/app/shipper/_components/mobile';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtMonthDayTime } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { useShipperTasks } from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import {
  departureText,
  palletSplitByPlan,
  vesselText,
} from '@/app/(saas)/app/shipper/_components/vessel-label';
import type { ShipperPlanItemT } from '@/types/saas-shipper';

type PlanRowStateT = {
  orderPending: boolean;
  planPending: boolean;
  replanPending: boolean;
};

function PlanStateChip({
  status,
  state,
}: {
  status: ShipperPlanItemT['status'];
  state: PlanRowStateT;
}) {
  if (state.replanPending) return <span className="m2-chip">다시 짜는 중</span>;
  if (state.planPending) return <span className="m2-chip m2-chip-brand">수락 대기</span>;
  if (state.orderPending) return <span className="m2-chip m2-chip-brand">확정 대기</span>;

  return (
    <span className={status === 'committed' ? 'm2-chip m2-chip-ok' : 'm2-chip m2-chip-warn'}>
      {PLAN_STATUS_LABEL[status] ?? status}
    </span>
  );
}

const actionLabel = ({ orderPending, planPending }: PlanRowStateT) => {
  if (planPending) return '확인하러 가기';
  if (orderPending) return '확정하러 가기';

  return '상세';
};

export function PlansView() {
  const plans = useShipperPlans();
  const { confirmations } = useShipperTasks();
  const pendingPlanIds = new Set(confirmations.map(({ plan }) => plan.plan_id));
  const planConfirmations = useShipperPlanConfirmations('pending');
  const awaitingPlanIds = new Set((planConfirmations.data ?? []).map(({ plan_id }) => plan_id));
  const splits = palletSplitByPlan(useShipperSettlements().data);

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
          <table className={cn('m2-table', CARD_TABLE)}>
            <thead>
              <tr>
                <th>선박</th>
                <th>출항</th>
                <th>상태</th>
                <th className="r">내 출하</th>
                <th className="r">내 파렛트 / 전체</th>
                <th>만든 시각</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plans.data.map(item => {
                const {
                  plan_id,
                  vessel,
                  departure,
                  status,
                  my_lot_ids,
                  my_pallets,
                  total_pallets,
                  created_at,
                } = item;
                const split = splits.get(plan_id);
                const rowState: PlanRowStateT = {
                  orderPending: pendingPlanIds.has(plan_id),
                  planPending: awaitingPlanIds.has(plan_id),
                  replanPending: isReplanPending(item),
                };

                return (
                  <tr key={plan_id}>
                    <td className={CARD_MAIN}>
                      <div className="m2-who">
                        {vesselText(vessel, split)}
                        <small className={cn('m2-num', MOBILE_BLOCK)}>
                          {departureText(departure, split)} · 내 {my_pallets}파렛트 / 전체{' '}
                          {total_pallets}
                        </small>
                      </div>
                    </td>
                    <td className={cn('m2-num', CARD_HIDE)}>
                      {departure ? fmtMonthDayTime(departure) : vesselText(null, split)}
                    </td>
                    <td>
                      <PlanStateChip status={status} state={rowState} />
                    </td>
                    <td className={cn('r m2-num', CARD_HIDE)}>{my_lot_ids.length}건</td>
                    <td className={cn('r m2-num', CARD_HIDE)}>
                      <b className="font-semibold">{my_pallets}</b>
                      <span className="text-m2-muted"> / {total_pallets}</span>
                    </td>
                    <td className={cn('m2-num text-m2-muted', CARD_HIDE)}>
                      {fmtMonthDayTime(created_at)}
                    </td>
                    <td className={cn('r', CARD_PUSH)}>
                      <Link
                        href={SHIPPER_PATHS.PLAN(plan_id)}
                        className="m2-btn m2-btn-sec m2-btn-sm"
                      >
                        {actionLabel(rowState)}
                        <ArrowRightIcon size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
