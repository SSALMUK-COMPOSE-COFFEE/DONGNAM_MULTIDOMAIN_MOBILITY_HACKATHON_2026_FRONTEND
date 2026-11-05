'use client';

import { type FormEvent, useId, useState } from 'react';

import { saasErrorReason } from '@/apis/saas/errors';
import { useSaveForwarderQuantityPolicy } from '@/apis/saas/quantity-reservations';
import { quantityTimestamp } from '@/app/(saas)/app/forwarder/voyages/_components/quantity-display';
import { DatePicker } from '@/components/ui/date-picker';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { QuantityPolicyInputT, VoyageQuantityStateT } from '@/types/saas-quantity';

type FormT = {
  cutoff_date: string;
  cutoff_time: string;
  hold_days: string;
  confirm_days: string;
  late_days: string;
  free_adjust: string;
  slot_rate_krw: string;
  rate_mid_percent: string;
  rate_late_percent: string;
  offer_timeout_minutes: string;
  detour_max_minutes: string;
  pilot: boolean;
};

type NumberFieldT = Exclude<keyof FormT, 'cutoff_date' | 'cutoff_time' | 'pilot'>;

const FIELDS: {
  key: NumberFieldT;
  label: string;
  min: number;
  max: number;
  step?: number | 'any';
}[] = [
  { key: 'slot_rate_krw', label: '취소 정산 기준 단가 (원/파렛트)', min: 0, max: 1_000_000_000 },
  { key: 'hold_days', label: '예약 시작 · 마감 며칠 전', min: 1, max: 365 },
  { key: 'confirm_days', label: '수량 확정 · 마감 며칠 전', min: 0, max: 365 },
  { key: 'late_days', label: '임박 구간 · 마감 며칠 전', min: 0, max: 365 },
  { key: 'free_adjust', label: '확정 후 무료 감축 수량 (파렛트)', min: 0, max: 1000 },
  { key: 'rate_mid_percent', label: '확정 구간 요율 (%)', min: 0, max: 100, step: 'any' },
  { key: 'rate_late_percent', label: '임박 구간 요율 (%)', min: 0, max: 100, step: 'any' },
  { key: 'offer_timeout_minutes', label: '보충 제안 응답 기한 (분)', min: 1, max: 1440 },
  { key: 'detour_max_minutes', label: '집하 경로 추가 소요 한도 (분)', min: 0, max: 1440 },
];

const initialForm = (state: VoyageQuantityStateT): FormT => {
  const policy = state.policy;
  const parts = new Date(new Date(policy.cutoff).getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16)
    .split('T');

  return {
    cutoff_date: parts[0],
    cutoff_time: parts[1],
    hold_days: String(policy.hold_days),
    confirm_days: String(policy.confirm_days),
    late_days: String(policy.late_days),
    free_adjust: String(policy.free_adjust),
    slot_rate_krw: String(policy.slot_rate_krw),
    rate_mid_percent: String(Number(policy.rate_mid) * 100),
    rate_late_percent: String(Number(policy.rate_late) * 100),
    offer_timeout_minutes: String(policy.offer_timeout_minutes),
    detour_max_minutes: String(policy.detour_max_minutes),
    pilot: policy.pilot,
  };
};

export function VoyagePolicyEditor({
  state,
  onDone,
}: {
  state: VoyageQuantityStateT;
  onDone: () => void;
}) {
  const id = useId();
  const [form, setForm] = useState(() => initialForm(state));
  const [error, setError] = useState('');
  const save = useSaveForwarderQuantityPolicy();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.cutoff_date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.cutoff_time)
    ) {
      setError('수량 변경 마감 날짜와 시각을 입력하세요.');
      return;
    }
    const initial = initialForm(state);
    const policy: QuantityPolicyInputT = {
      ...state.policy,
      expected_revision: state.revision,
      cutoff:
        form.cutoff_date === initial.cutoff_date && form.cutoff_time === initial.cutoff_time
          ? state.policy.cutoff
          : `${form.cutoff_date}T${form.cutoff_time}:00+09:00`,
      hold_days: Number(form.hold_days),
      confirm_days: Number(form.confirm_days),
      late_days: Number(form.late_days),
      free_adjust: Number(form.free_adjust),
      slot_rate_krw: Number(form.slot_rate_krw),
      rate_mid:
        form.rate_mid_percent === initial.rate_mid_percent
          ? state.policy.rate_mid
          : Number(form.rate_mid_percent) / 100,
      rate_late:
        form.rate_late_percent === initial.rate_late_percent
          ? state.policy.rate_late
          : Number(form.rate_late_percent) / 100,
      offer_timeout_minutes: Number(form.offer_timeout_minutes),
      detour_max_minutes: Number(form.detour_max_minutes),
      pilot: form.pilot,
    };
    setError('');
    save.mutate(
      { planId: state.plan_id, voyageId: state.voyage_id, policy },
      { onSuccess: onDone }
    );
  };

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-col gap-5">
      <div>
        <DialogTitle>항차 수량 정책 수정</DialogTitle>
        <DialogDescription>
          같은 항차의 컨테이너에 공통으로 적용합니다. 모든 시각은 한국 시간(KST)입니다.
        </DialogDescription>
      </div>
      <div className="rounded-xl bg-m2-brand-soft px-4 py-3 text-sm">
        <span className="text-m2-muted">출항 예정</span>
        <p className="mt-1 font-semibold">{quantityTimestamp(state.policy.departure)}</p>
        <p className="m2-sub mt-1">수량 변경 마감은 실제 CY 반입 마감 이내여야 합니다.</p>
      </div>
      <fieldset
        disabled={save.isPending || state.policy_locked}
        className="grid min-w-0 gap-4 min-[600px]:grid-cols-2"
      >
        <div className="min-w-0">
          <label className="mb-2 block text-sm font-semibold" htmlFor={`${id}-cutoff-date`}>
            수량 변경 마감일 (KST)
          </label>
          <DatePicker
            id={`${id}-cutoff-date`}
            className="m2-inp w-full"
            value={form.cutoff_date}
            onValueChange={value => setForm(prev => ({ ...prev, cutoff_date: value }))}
          />
        </div>
        <label className="block min-w-0 text-sm font-semibold">
          수량 변경 마감 시각 (KST)
          <input
            className="m2-inp mt-2 w-full"
            type="time"
            required
            value={form.cutoff_time}
            onChange={event => setForm(prev => ({ ...prev, cutoff_time: event.target.value }))}
          />
        </label>
        {FIELDS.map(field => (
          <label key={field.key} className="block min-w-0 text-sm font-semibold">
            {field.label}
            <input
              className="m2-inp mt-2 w-full"
              type="number"
              inputMode="decimal"
              required
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              value={form[field.key]}
              onChange={event => setForm(prev => ({ ...prev, [field.key]: event.target.value }))}
            />
          </label>
        ))}
        <label className="flex items-start gap-3 rounded-xl border border-m2-line p-3 text-sm min-[600px]:col-span-2">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0"
            checked={form.pilot}
            onChange={event => setForm(prev => ({ ...prev, pilot: event.target.checked }))}
          />
          <span>
            시범 항차 수량 조정 부담금 면제
            <span className="m2-sub mt-1 block">
              운임 자체의 무료 여부와는 별도인 수량 조정 정책입니다.
            </span>
          </span>
        </label>
      </fieldset>
      {error || save.isError ? (
        <p role="alert" className="text-sm text-m2-crit">
          {error || saasErrorReason(save.error) || '설정을 저장하지 못했습니다. 다시 확인하세요.'}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="m2-btn m2-btn-sec"
          disabled={save.isPending}
          onClick={onDone}
        >
          닫기
        </button>
        <button
          type="submit"
          className="m2-btn m2-btn-pri"
          disabled={save.isPending || state.policy_locked}
        >
          {save.isPending ? '저장 중' : '항차 정책 저장'}
        </button>
      </div>
    </form>
  );
}
