'use client';

import { useState } from 'react';

import { kstDayTime } from '@/app/(saas)/app/platform/_components/m2-format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlanEventT, PlanSessionT } from '@/types/api';

const HOUR_MS = 3_600_000;
const INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const KST_INPUT = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const toKstInput = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? '' : KST_INPUT.format(date).replace(' ', 'T');
};

const fromKstInput = (value: string) => (INPUT_PATTERN.test(value) ? `${value}:00+09:00` : null);

export const hoursText = (hours: number) => {
  const rounded = Math.round(hours * 10) / 10;

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

type ReplanDelayTabPropsT = {
  session: PlanSessionT;
  isReplanning: boolean;
  onRun: (event: PlanEventT, label: string, focusContainerId: string | null) => void;
};

export function ReplanDelayTab({ session, isReplanning, onRun }: ReplanDelayTabPropsT) {
  const { plan, scenario } = session;
  const usedVoyageIds = new Set(
    plan.containers.filter(({ used }) => used).map(({ voyage_id }) => voyage_id)
  );
  const voyages = scenario.voyages.filter(({ id }) => usedVoyageIds.has(id));
  const [pickedId, setPickedId] = useState('');
  const voyage = voyages.find(({ id }) => id === pickedId) ?? voyages[0] ?? null;
  const [draft, setDraft] = useState<{ voyageId: string; value: string } | null>(null);
  const inputValue =
    draft && voyage && draft.voyageId === voyage.id ? draft.value : toKstInput(voyage?.etd ?? null);
  const newEtd = fromKstInput(inputValue);
  const delayHours =
    voyage && newEtd ? (new Date(newEtd).getTime() - new Date(voyage.etd).getTime()) / HOUR_MS : 0;
  const isDelayed = delayHours > 0;
  const isTouched = !!draft && draft.voyageId === voyage?.id;
  const focusContainerId =
    plan.containers.find(({ used, voyage_id }) => used && voyage_id === voyage?.id)?.container_id ??
    null;
  const delayLabel = `${hoursText(delayHours)}시간 지연`;
  const idleLabel = isDelayed
    ? `${voyage?.vessel_name ?? ''} ${delayLabel}으로 다시 짜기`
    : '새 ETD를 넣으세요';
  const actionLabel = isReplanning ? '다시 짜는 중' : idleLabel;

  if (!voyage) {
    return <p className="m2-sub mt-0">해상 항차가 없어 일정을 바꿀 대상이 없습니다.</p>;
  }

  const run = () => {
    if (!newEtd || !isDelayed) return;
    onRun(
      {
        type: 'delay',
        voyage_id: voyage.id,
        new_etd: newEtd,
        new_cy_cutoff: null,
        source: 'manual',
      },
      `선석 일정 변경 · ${voyage.vessel_name} ${delayLabel}`,
      focusContainerId
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="m2-lbl">항차</div>
      <Select value={voyage.id} onValueChange={setPickedId}>
        <SelectTrigger
          aria-label="항차"
          className="h-10 w-full min-w-0 rounded-[12px] bg-white *:data-[slot=select-value]:truncate"
        >
          <SelectValue placeholder="항차 선택" />
        </SelectTrigger>
        <SelectContent>
          {voyages.map(({ id, vessel_name: vesselName, etd }) => (
            <SelectItem key={id} value={id}>
              {vesselName} · {id} · ETD {kstDayTime(etd)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="m2-lines mt-0">
        <div>
          <span>지금 ETD</span>
          <b>{kstDayTime(voyage.etd)}</b>
        </div>
        <div>
          <span>CY 반입 마감</span>
          <b>{kstDayTime(voyage.cy_cutoff)}</b>
        </div>
      </div>

      <div className="m2-field mb-0">
        <label htmlFor="replan-delay-etd">새 ETD (한국 시각)</label>
        <input
          id="replan-delay-etd"
          type="datetime-local"
          className="m2-inp"
          value={inputValue}
          aria-invalid={isTouched && !isDelayed}
          aria-describedby="replan-delay-etd-hint"
          onChange={event => setDraft({ voyageId: voyage.id, value: event.target.value })}
        />
        <p id="replan-delay-etd-hint" className="m2-sub mt-0">
          {isDelayed ? (
            <span className="m2-chip m2-chip-warn">+{delayLabel}</span>
          ) : (
            '지금 ETD보다 늦은 시각을 넣으세요.'
          )}
        </p>
      </div>

      <p className="m2-note mt-0">
        CY 반입 마감 {kstDayTime(voyage.cy_cutoff)}은 그대로 둡니다. 선사가 마감을 따로 옮기면 그
        공지를 기준으로 다시 계산하세요.
      </p>

      <button
        type="button"
        className="m2-btn m2-btn-pri m2-btn-lg w-full"
        disabled={!isDelayed || isReplanning}
        onClick={run}
      >
        {actionLabel}
      </button>
    </div>
  );
}
