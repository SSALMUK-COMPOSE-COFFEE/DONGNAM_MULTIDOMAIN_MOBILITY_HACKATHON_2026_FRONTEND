'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';

import { useForwarderOrgId } from '@/apis/saas/forwarder';
import { forwarderExecutionKeys, useSaveExecutionNumbers } from '@/apis/saas/forwarder-execution';
import { monthDayTime } from '@/app/(saas)/app/forwarder/_components/format';
import type {
  ForwarderContainerExecutionT,
  ForwarderExecutionNumbersInputT,
} from '@/types/saas-forwarder';

type NumberFieldT = keyof ForwarderExecutionNumbersInputT;

const NUMBER_FIELDS: readonly { key: NumberFieldT; label: string; hint: string }[] = [
  { key: 'booking_no', label: '부킹 번호', hint: '영문 대문자·숫자·하이픈 4~30자' },
  { key: 'container_no', label: '컨테이너 번호', hint: 'ISO 6346 · 예: CSQU3054383' },
  { key: 'seal_no', label: '씰 번호', hint: '영문 대문자·숫자·하이픈 4~20자' },
];

const MOCK_FLAG: Record<NumberFieldT, 'booking_no_mock' | 'container_no_mock' | 'seal_no_mock'> = {
  booking_no: 'booking_no_mock',
  container_no: 'container_no_mock',
  seal_no: 'seal_no_mock',
};

const normalized = (value: string) => value.replace(/\s+/g, '').toUpperCase();

const savedValues = (container: ForwarderContainerExecutionT): Record<NumberFieldT, string> => ({
  booking_no: container.booking_no,
  container_no: container.container_no,
  seal_no: container.seal_no,
});

const savedSignature = (container: ForwarderContainerExecutionT) =>
  [container.booking_no, container.container_no, container.seal_no, container.entered_at].join('|');

type ExecutionNumbersFormPropsT = {
  planId: string;
  container: ForwarderContainerExecutionT;
};

export function ExecutionNumbersForm({ planId, container }: ExecutionNumbersFormPropsT) {
  const formId = useId();
  const orgId = useForwarderOrgId();
  const queryClient = useQueryClient();
  const save = useSaveExecutionNumbers(planId);
  const [values, setValues] = useState(() => savedValues(container));
  const [signature, setSignature] = useState(() => savedSignature(container));

  if (signature !== savedSignature(container)) {
    setSignature(savedSignature(container));
    setValues(savedValues(container));
  }

  const changes = NUMBER_FIELDS.reduce<ForwarderExecutionNumbersInputT>((acc, { key }) => {
    const next = normalized(values[key]);
    const isMock = container[MOCK_FLAG[key]];
    if (next === container[key]) return acc;
    if (!next) return isMock ? acc : { ...acc, [key]: null };

    return { ...acc, [key]: next };
  }, {});
  const hasChanges = Object.keys(changes).length > 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasChanges || save.isPending) return;
    save.mutate(
      { containerId: container.container_id, ...changes },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey: forwarderExecutionKeys.card(orgId, planId),
            exact: true,
          }),
      }
    );
  };

  return (
    <form
      onSubmit={submit}
      aria-label={`${container.container_id} 실행 번호`}
      className="flex flex-col gap-2"
    >
      <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
        {NUMBER_FIELDS.map(({ key, label, hint }) => {
          const inputId = `${formId}-${key}`;
          const isMock = container[MOCK_FLAG[key]];

          return (
            <div key={key} className="m2-field mb-0">
              <label htmlFor={inputId} className="flex items-center gap-1.5">
                {label}
                {isMock ? <span className="m2-chip m2-chip-warn">가상 번호</span> : null}
              </label>
              <input
                id={inputId}
                className="m2-inp m2-mono w-full text-[13.5px]"
                value={values[key]}
                autoComplete="off"
                spellCheck={false}
                aria-describedby={`${inputId}-hint`}
                onChange={event => setValues(prev => ({ ...prev, [key]: event.target.value }))}
              />
              <small id={`${inputId}-hint`} className="text-[11.5px] text-m2-muted">
                {hint}
              </small>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12.5px] text-m2-muted">
          {container.entered_at
            ? `입력 ${monthDayTime(container.entered_at)}`
            : '아직 입력하지 않았습니다 · 가상 번호로 표시 중'}
        </span>
        <button
          type="submit"
          className="m2-btn m2-btn-pri m2-btn-sm"
          aria-disabled={!hasChanges || save.isPending}
        >
          {save.isPending ? '저장 중' : '번호 저장'}
        </button>
      </div>
    </form>
  );
}
