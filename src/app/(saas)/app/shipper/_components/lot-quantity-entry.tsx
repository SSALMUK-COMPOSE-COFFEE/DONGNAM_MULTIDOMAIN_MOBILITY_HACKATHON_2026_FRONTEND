'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useReservationState } from '@/apis/saas/quantity-reservations';
import { QuantityAdjustmentFlow } from '@/app/(saas)/app/shipper/_components/quantity-reservation-section';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ShipperLotT, ShipperPlanItemT } from '@/types/saas-shipper';

export function LotQuantityEntry({
  lot,
  label,
  candidates,
  isLoading,
  isError,
  onRetry,
  onClose,
  returnTo,
}: {
  lot: ShipperLotT;
  label: string;
  candidates: ShipperPlanItemT[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onClose: () => void;
  returnTo: string;
}) {
  const [selected, setSelected] = useState('');
  const candidate =
    candidates.find(plan => plan.plan_id === selected) ??
    (candidates.length === 1 ? candidates[0] : null);
  const planId = candidate?.plan_id ?? '';
  const reservation = useReservationState(
    planId,
    lot.id,
    !isLoading && !isError && candidate?.status === 'committed'
  );
  const state = reservation.data;
  const verified = state?.plan_id === planId && state.lot_id === lot.id;

  if (
    !isLoading &&
    !isError &&
    candidate?.status === 'committed' &&
    verified &&
    state.can_adjust &&
    !state.pending_adjustment
  ) {
    return (
      <QuantityAdjustmentFlow
        state={state}
        label={label}
        onRefresh={() => {
          void reservation.refetch();
        }}
        onClose={onClose}
      />
    );
  }

  const renderStatus = () => {
    if (isLoading) return <p role="status">예약된 운송계획을 확인하고 있습니다.</p>;
    if (isError)
      return (
        <div role="alert">
          <p>운송계획을 불러오지 못했습니다.</p>
          <button type="button" className="m2-btn m2-btn-sec" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      );
    if (candidates.length > 1 && !selected)
      return (
        <div className="grid gap-2">
          <p className="m2-note">수량을 변경할 운송계획을 선택하세요.</p>
          {candidates.map(plan => (
            <button
              type="button"
              key={plan.plan_id}
              className="m2-btn m2-btn-sec h-auto! justify-start! text-left! whitespace-normal!"
              onClick={() => setSelected(plan.plan_id)}
            >
              {plan.vessel || '운송계획'} · {plan.departure || '출발일 미정'} ·{' '}
              {plan.plan_id.slice(0, 8)}
            </button>
          ))}
        </div>
      );
    if (!candidate)
      return (
        <p className="m2-note">
          연결된 운송계획을 확인할 수 없습니다. 계획 목록에서 예약 상태를 확인하세요.
        </p>
      );
    if (candidate.status !== 'committed')
      return (
        <p className="m2-note">
          아직 실행 확정 전인 계획입니다. 운송계획에서 진행 상태를 확인하세요.
        </p>
      );
    if (reservation.isPending) return <p role="status">변경 가능한 수량을 확인하고 있습니다.</p>;
    if (reservation.isError)
      return (
        <div role="alert">
          <p className="m2-note">
            수량 정책을 확인하지 못했습니다. 예약 상세에서 상태를 확인하거나 다시 시도하세요.
          </p>
          <button
            type="button"
            className="m2-btn m2-btn-sec"
            onClick={() => {
              void reservation.refetch();
            }}
          >
            다시 시도
          </button>
        </div>
      );
    return (
      <p className="m2-note">
        {state?.pending_adjustment
          ? '기존 변경 요청이 처리 중입니다. 예약 상세에서 진행 상태를 확인하세요.'
          : '지금은 수량을 변경할 수 없습니다. 예약 상세에서 정책과 예약 상태를 확인하세요.'}
      </p>
    );
  };
  const detailHref = planId
    ? `${SHIPPER_PATHS.QUANTITY(planId, lot.id)}&returnTo=${encodeURIComponent(returnTo)}`
    : SHIPPER_PATHS.PLANS;
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent data-ui="m2" onCloseAutoFocus={event => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>출하 수량 변경</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        {renderStatus()}
        <div className="flex justify-end gap-2">
          <button type="button" className="m2-btn m2-btn-sec" onClick={onClose}>
            닫기
          </button>
          <Link className="m2-btn m2-btn-pri" href={detailHref}>
            {planId ? '예약 상세' : '계획 목록'}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
