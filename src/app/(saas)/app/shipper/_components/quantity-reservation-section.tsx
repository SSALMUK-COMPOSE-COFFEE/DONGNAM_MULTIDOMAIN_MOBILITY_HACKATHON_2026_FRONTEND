'use client';

import { isAxiosError } from 'axios';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { saasErrorReason } from '@/apis/saas/errors';
import {
  useConfirmReservedQuantity,
  useQuantityQuote,
  useShipperQuantityPolicies,
  useSubmitQuantity,
} from '@/apis/saas/quantity-reservations';
import { QuantityAdjustmentDialog } from '@/app/(saas)/app/shipper/_components/quantity-adjustment-dialog';
import { CardSkeleton, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import { useDebouncedValue } from '@/app/(saas)/app/shipper/_components/use-now';
import { remainingMilliseconds, remainingTimeText, useServerNow } from '@/hooks/useServerNow';
import type { QuantityQuoteT, ReservationStateT } from '@/types/saas-quantity';
import { formatKstMonthDayTime } from '@/utils/kst';

const QUANTITY_STATUS: Record<string, string> = {
  scheduled: '예약 기간 전',
  reserved: '수량 예약',
  confirmed: '수량 확정',
  cancelled: '취소됨',
};
const WINDOW = { reservation: '무료 조정 구간', confirmed: '확정 구간', late: '임박 구간' };
const money = (value: number) => `${value.toLocaleString('ko-KR')}원`;
const rate = (value: string) =>
  new Intl.NumberFormat('ko-KR', { style: 'percent', maximumFractionDigits: 2 }).format(
    Number(value)
  );
const isConflict = (error: unknown) => isAxiosError(error) && error.response?.status === 409;

export function QuantityReservationSection({
  planId,
  labelOf,
}: {
  planId: string;
  labelOf?: (lotId: string) => string;
}) {
  const states = useShipperQuantityPolicies(planId);

  return (
    <section className="m2-card min-w-0" aria-label="출하 예약 수량">
      <h2 className="m2-h2">출하 예약 수량</h2>
      <p className="m2-sub mb-4">
        수량 확정은 운송계획 수락과 별도입니다. 변경 요청은 포워더가 적용한 뒤 반영됩니다.
      </p>
      {states.isPending && <CardSkeleton height={140} />}
      {states.isError && (
        <QueryError
          message="예약 수량을 확인하지 못했습니다."
          isRetrying={states.isFetching}
          onRetry={() => states.refetch()}
        />
      )}
      {states.isSuccess && states.data.length === 0 && (
        <p className="m2-sub">등록된 해상 수량 정책이 없습니다. 항차 설정은 포워더가 관리합니다.</p>
      )}
      <div className="flex flex-col gap-3">
        {states.data
          ?.flatMap(voyage => voyage.reservations)
          .map(state => (
            <ReservationQuantityCard
              key={`${state.plan_id}:${state.lot_id}`}
              state={state}
              receivedAt={states.dataUpdatedAt}
              label={labelOf?.(state.lot_id) ?? state.lot_id}
              onRefresh={() => {
                void states.refetch();
              }}
            />
          ))}
      </div>
    </section>
  );
}

export function ReservationQuantityCard({
  state,
  receivedAt,
  label,
  onRefresh,
}: {
  state: ReservationStateT;
  receivedAt: number;
  label: string;
  onRefresh: () => void;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirm = useConfirmReservedQuantity(state.plan_id, state.lot_id);
  const requestKey = useRef<{ revision: number; key: string } | null>(null);
  const now = useServerNow(state.server_now, receivedAt);
  const remaining = remainingMilliseconds(state.policy.cutoff, now);
  const canAdjust =
    state.can_adjust && !state.pending_adjustment && remaining !== null && remaining > 0;

  return (
    <article className="rounded-[10px] border border-m2-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="min-w-0 text-sm font-semibold break-words">{label}</h3>
        <span className="m2-chip">
          {QUANTITY_STATUS[state.quantity_status] ?? state.quantity_status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <QuantityFact label="예약 수량" value={`${state.current_quantity}파렛트`} />
        <QuantityFact
          label="확정 수량"
          value={state.confirmed_quantity === null ? '미확정' : `${state.confirmed_quantity}파렛트`}
        />
        <QuantityFact label="무료 감량 잔량" value={`${state.free_adjust_remaining}파렛트`} />
        <QuantityFact label="현재 예상 부담액" value={money(state.final_fee_krw)} />
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-m2-muted">
        수량 변경 마감 {formatKstMonthDayTime(state.policy.cutoff)} KST ·{' '}
        {remainingTimeText(state.policy.cutoff, now)}
      </p>
      {state.quantity_status === 'scheduled' && (
        <p className="mt-2 text-xs text-m2-muted">
          예약 시작 {formatKstMonthDayTime(state.reservation_opens_at)} KST
        </p>
      )}
      {state.pending_adjustment && (
        <p role="status" className="m2-note mt-3">
          포워더 적용 대기 중인 수량 변경 요청이 있습니다.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {state.can_confirm_quantity && (
          <button
            type="button"
            className="m2-btn m2-btn-pri m2-btn-sm"
            disabled={confirm.isPending}
            onClick={() => {
              setConfirmError(null);
              setConfirming(true);
            }}
          >
            수량 확정
          </button>
        )}
        <button
          type="button"
          className="m2-btn m2-btn-sec m2-btn-sm"
          disabled={!canAdjust}
          onClick={() => setAdjusting(true)}
        >
          취소·감량
        </button>
      </div>
      {confirming && (
        <div className="mt-3 rounded-lg border border-m2-line bg-m2-brand-soft p-3">
          <p className="text-sm">현재 {state.current_quantity}파렛트를 확정하시겠습니까?</p>
          <p className="mt-1 text-xs text-m2-ink-2">
            이후 감량은 항차 정책에 따라 출항 후 정산에 반영됩니다.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="m2-btn m2-btn-sec m2-btn-sm"
              disabled={confirm.isPending}
              onClick={() => setConfirming(false)}
            >
              닫기
            </button>
            <button
              type="button"
              className="m2-btn m2-btn-pri m2-btn-sm"
              disabled={confirm.isPending}
              onClick={() => {
                if (!requestKey.current || requestKey.current.revision !== state.revision)
                  requestKey.current = { revision: state.revision, key: crypto.randomUUID() };
                confirm.mutate(
                  { revision: state.revision, idempotency_key: requestKey.current.key },
                  {
                    onSuccess: () => {
                      setConfirming(false);
                      toast.success('예약 수량을 확정했습니다.');
                    },
                    onError: error => {
                      setConfirmError(saasErrorReason(error) ?? '수량을 확정하지 못했습니다.');
                      if (isConflict(error)) onRefresh();
                    },
                  }
                );
              }}
            >
              {confirm.isPending ? '확정 중' : '이 수량으로 확정'}
            </button>
          </div>
          {confirmError && (
            <p role="alert" className="mt-2 text-xs text-m2-crit">
              {confirmError}
            </p>
          )}
        </div>
      )}
      {adjusting && (
        <QuantityAdjustmentFlow
          state={state}
          label={label}
          onRefresh={onRefresh}
          onClose={() => setAdjusting(false)}
        />
      )}
    </article>
  );
}

function QuantityFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-m2-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-m2-ink">{value}</dd>
    </div>
  );
}

function QuoteSummary({ quote }: { quote: QuantityQuoteT }) {
  return (
    <section className="quantity-quote-summary" aria-label="수량 변경 견적">
      <div className="quantity-quote-total">
        <span>이번 예상 부담금</span>
        <strong>{money(quote.fee_krw)}</strong>
      </div>
      <dl className="quantity-quote-breakdown">
        <div>
          <dt>현재 구간</dt>
          <dd>
            {WINDOW[quote.window]} · {rate(quote.rate)}
          </dd>
        </div>
        <div>
          <dt>이번 감량</dt>
          <dd>{quote.reduced_quantity}파렛트</dd>
        </div>
        <div>
          <dt>추가 과금 대상</dt>
          <dd>{quote.newly_charged_quantity}파렛트</dd>
        </div>
        <div>
          <dt>변경 후 무료 잔량</dt>
          <dd>{quote.free_adjust_remaining}파렛트</dd>
        </div>
        {quote.refill_credit_krw > 0 && (
          <div>
            <dt>기존 재충원 차감</dt>
            <dd>{money(quote.refill_credit_krw)}</dd>
          </div>
        )}
        {quote.final_fee_krw !== quote.fee_krw && (
          <div className="quantity-quote-net">
            <dt>이전 조정 포함 예상 합계</dt>
            <dd>{money(quote.final_fee_krw)}</dd>
          </div>
        )}
      </dl>
      {quote.exemption && (
        <p className="quantity-quote-notice">
          {quote.exemption === 'pilot'
            ? '무료 시범 항차로 부담금이 면제됩니다.'
            : '시스템 항공 전환으로 부담금이 면제됩니다.'}
        </p>
      )}
      {quote.requires_execution_approval && (
        <p className="quantity-quote-notice">
          포워더 검토와 기존 운송 변경·수락 절차를 거쳐 적용됩니다.
        </p>
      )}
    </section>
  );
}

export function QuantityAdjustmentFlow({
  state,
  label,
  onRefresh,
  onClose,
}: {
  state: ReservationStateT;
  label: string;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState(String(state.current_quantity));
  const [requestError, setRequestError] = useState<string | null>(null);
  const count = /^\d+$/.test(quantity.trim()) ? Number(quantity) : Number.NaN;
  const valid = Number.isSafeInteger(count) && count >= 0 && count <= state.current_quantity;
  const fieldError = valid
    ? null
    : `0부터 현재 수량(${state.current_quantity})까지 정수로 입력하세요.`;
  const debounced = useDebouncedValue(valid ? count : null, 350);
  const quote = useQuantityQuote(
    state.plan_id,
    state.lot_id,
    debounced,
    state.can_adjust,
    state.revision
  );
  const submit = useSubmitQuantity(state.plan_id, state.lot_id);
  const now = useServerNow(quote.data?.server_now, quote.dataUpdatedAt);
  const expires = quote.data ? remainingMilliseconds(quote.data.expires_at, now) : null;
  const matches =
    !!quote.data &&
    valid &&
    quote.data.quantity === count &&
    quote.data.revision === state.revision &&
    debounced === count;
  const expired = expires === 0;
  const canConfirm =
    matches &&
    !quote.isFetching &&
    expires !== null &&
    expires > 0 &&
    count < state.current_quantity &&
    state.can_adjust &&
    !state.pending_adjustment;
  const quoteContent = (
    <div className="flex flex-col gap-2">
      {quote.data && matches && <QuoteSummary quote={quote.data} />}
      {quote.isError && (
        <p role="alert" className="text-xs text-m2-crit">
          {saasErrorReason(quote.error) ?? '변경 견적을 불러오지 못했습니다.'}
        </p>
      )}
      {quote.data && matches && (
        <p className="quantity-quote-expiry">
          견적 유효시간 {remainingTimeText(quote.data.expires_at, now)}
        </p>
      )}
      {(expired || quote.isError) && (
        <button
          type="button"
          className="self-start text-xs font-semibold text-m2-brand-ink underline"
          disabled={submit.isPending}
          onClick={() => {
            if (submit.isPending) return;
            setRequestError(null);
            onRefresh();
            void quote.refetch();
          }}
        >
          견적 다시 확인
        </button>
      )}
    </div>
  );

  return (
    <QuantityAdjustmentDialog
      open
      onOpenChange={open => !open && onClose()}
      shipmentLabel={label}
      currentQuantity={state.current_quantity}
      quantity={quantity}
      onQuantityChange={value => {
        if (submit.isPending) return;
        setQuantity(value);
        setRequestError(null);
      }}
      fieldError={fieldError}
      requestError={requestError}
      quoteContent={quoteContent}
      quoteLoading={quote.isFetching || (valid && debounced !== count)}
      submitting={submit.isPending}
      canConfirm={canConfirm}
      onConfirm={() => {
        if (!canConfirm || !quote.data || submit.isPending) return;
        setRequestError(null);
        submit.mutate(
          { quote_id: quote.data.quote_id, idempotency_key: `quantity-${quote.data.quote_id}` },
          {
            onSuccess: result => {
              toast.success(
                result.status === 'queued'
                  ? '수량 변경 요청을 보냈습니다. 포워더 적용 후 반영됩니다.'
                  : '출하 수량을 변경했습니다.'
              );
              onClose();
            },
            onError: error => {
              setRequestError(saasErrorReason(error) ?? '수량 변경을 요청하지 못했습니다.');
              if (isConflict(error)) {
                onRefresh();
                void quote.refetch();
              }
            },
          }
        );
      }}
    />
  );
}
