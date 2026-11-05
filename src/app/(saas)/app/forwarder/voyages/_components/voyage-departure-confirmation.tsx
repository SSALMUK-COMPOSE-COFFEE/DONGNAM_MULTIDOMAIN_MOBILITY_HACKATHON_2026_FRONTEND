'use client';

import { useId, useRef, useState } from 'react';

import { saasErrorReason } from '@/apis/saas/errors';
import { useConfirmQuantityDeparture } from '@/apis/saas/quantity-reservations';
import { quantityTimestamp } from '@/app/(saas)/app/forwarder/voyages/_components/quantity-display';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { VoyageQuantityStateT } from '@/types/saas-quantity';

export function VoyageDepartureConfirmation({ state }: { state: VoyageQuantityStateT }) {
  const id = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const section = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [observed, setObserved] = useState(false);
  const [requestKey, setRequestKey] = useState('');
  const confirm = useConfirmQuantityDeparture();

  if (state.departure_confirmed_at)
    return (
      <section ref={section} tabIndex={-1} className="m2-card">
        <div className="m2-card-h">
          <h2 className="m2-h2">출항 확인·정산 계산</h2>
          <span className="m2-chip m2-chip-ok">계산 확정</span>
        </div>
        <p className="m2-sub">
          실제 출항 확인 기록 · {quantityTimestamp(state.departure_confirmed_at)} (KST)
        </p>
        <p className="mt-2 text-sm">취소·보충 운임 조정 계산이 확정되었습니다.</p>
      </section>
    );

  return (
    <section ref={section} tabIndex={-1} className="m2-card">
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">출항 확인·정산 계산 확정</h2>
          <p className="m2-sub">
            포워더가 실제 출항 여부를 확인한 뒤 항차의 운임 조정 계산을 확정합니다.
          </p>
        </div>
      </div>
      {!state.can_confirm_departure ? (
        <p className="m2-sub mb-3">
          {state.departure_blocked_reason ?? '현재 항차는 계산 확정 조건을 충족하지 않았습니다.'}
        </p>
      ) : null}
      <button
        ref={opener}
        type="button"
        className="m2-btn m2-btn-pri"
        disabled={!state.can_confirm_departure || confirm.isPending}
        onClick={() => {
          setObserved(false);
          setRequestKey(crypto.randomUUID());
          confirm.reset();
          setOpen(true);
        }}
      >
        출항 확인·계산 확정
      </button>
      <Dialog
        open={open}
        onOpenChange={next => {
          if (!confirm.isPending) setOpen(next);
        }}
      >
        <DialogContent
          onCloseAutoFocus={event => {
            event.preventDefault();
            if (opener.current?.isConnected && !opener.current.disabled) opener.current.focus();
            else section.current?.focus();
          }}
          data-ui="m2"
          className="w-[calc(100%-2rem)] sm:max-w-md"
        >
          <DialogTitle>실제 출항 확인</DialogTitle>
          <DialogDescription>
            실제 출항을 확인하고 취소 부담금과 보충·보상 운임 조정 계산을 확정합니다. 계산 내역은
            화주 정산 화면에 반영됩니다.
          </DialogDescription>
          <label
            htmlFor={id}
            className="my-3 flex items-start gap-3 rounded-xl border border-m2-line p-3 text-sm"
          >
            <input
              id={id}
              type="checkbox"
              checked={observed}
              onChange={event => setObserved(event.target.checked)}
              className="mt-1 size-4 shrink-0"
              disabled={confirm.isPending}
            />
            <span>이 항차의 실제 출항을 확인했습니다.</span>
          </label>
          {confirm.isError ? (
            <p role="alert" className="text-sm text-m2-crit">
              {saasErrorReason(confirm.error) ??
                '계산을 확정하지 못했습니다. 항차 상태를 다시 확인하세요.'}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="m2-btn m2-btn-sec"
              disabled={confirm.isPending}
              onClick={() => setOpen(false)}
            >
              닫기
            </button>
            <button
              type="button"
              className="m2-btn m2-btn-pri"
              disabled={!observed || !state.can_confirm_departure || confirm.isPending}
              onClick={() =>
                confirm.mutate(
                  {
                    planId: state.plan_id,
                    voyageId: state.voyage_id,
                    departure_observed: true,
                    idempotency_key: requestKey,
                  },
                  { onSuccess: () => setOpen(false) }
                )
              }
            >
              {confirm.isPending ? '확정 중' : '정산 계산 확정'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
