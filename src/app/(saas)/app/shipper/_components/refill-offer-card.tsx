'use client';

import { useId } from 'react';

type RefillOfferCardPropsT = {
  title: string;
  destination: string;
  capacityText: string;
  pickupText: string;
  remainingText: string;
  statusText?: string | null;
  quantity: string;
  onQuantityChange: (value: string) => void;
  fieldError?: string | null;
  requestError?: string | null;
  actionable: boolean;
  pending: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function RefillOfferCard({
  title,
  destination,
  capacityText,
  pickupText,
  remainingText,
  statusText,
  quantity,
  onQuantityChange,
  fieldError,
  requestError,
  actionable,
  pending,
  onAccept,
  onDecline,
}: RefillOfferCardPropsT) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  return (
    <article className="m2-card min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m2-h3 break-words">{title}</h2>
          <p className="m2-sub">
            {destination} · {capacityText}
          </p>
        </div>
        <span className="text-xs font-semibold text-m2-ink-2">{statusText ?? remainingText}</span>
      </div>
      <p className="mt-3 text-sm text-m2-ink-2">집하 {pickupText}</p>
      {actionable && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor={fieldId} className="text-xs font-semibold">
              수락할 수량 (파렛트)
            </label>
            <input
              id={fieldId}
              className="m2-inp w-full"
              inputMode="numeric"
              value={quantity}
              disabled={pending}
              onChange={event => onQuantityChange(event.target.value)}
              aria-invalid={!!fieldError}
              {...(fieldError ? { 'aria-describedby': errorId } : {})}
            />
            {fieldError && (
              <p id={errorId} className="text-xs text-m2-crit">
                {fieldError}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="m2-btn m2-btn-sec"
              disabled={pending}
              onClick={onDecline}
            >
              거절
            </button>
            <button
              type="button"
              className="m2-btn m2-btn-pri"
              disabled={pending}
              onClick={onAccept}
            >
              {pending ? '처리 중' : '수량 확인 후 수락'}
            </button>
          </div>
        </div>
      )}
      {requestError && (
        <p role="alert" className="mt-3 text-sm text-m2-crit">
          {requestError}
        </p>
      )}
    </article>
  );
}
