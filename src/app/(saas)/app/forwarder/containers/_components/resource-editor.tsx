'use client';

import { type ReactNode, useId, useRef, useState } from 'react';

import { saasErrorReason } from '@/apis/saas/errors';
import { useSaveResource } from '@/apis/saas/resources';
import { DatePicker } from '@/components/ui/date-picker';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ResourceInputT, ResourceOptionsT, ResourceT } from '@/types/saas-resources';

type ResourceFormT = {
  name: string;
  kind: string;
  capacity_pallets: string;
  temp_min_c: string;
  temp_max_c: string;
  vessel_name: string;
  terminal: string;
  origin: string;
  destination: string;
  etd_date: string;
  etd_time: string;
  cutoff_date: string;
  cutoff_time: string;
  transit_days: string;
  enabled: boolean;
};

type TextFieldT = Exclude<keyof ResourceFormT, 'enabled'>;

const localParts = (value: string) =>
  new Date(new Date(value).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16).split('T');
const timestamp = (date: string, time: string) => `${date}T${time}:00+09:00`;

const initialForm = (resource: ResourceT | null): ResourceFormT => {
  const [etdDate, etdTime] = resource ? localParts(resource.etd) : ['', ''];
  const [cutoffDate, cutoffTime] = resource ? localParts(resource.cy_cutoff) : ['', ''];
  return {
    name: resource?.name ?? '',
    kind: resource?.kind ?? '40RH-CA',
    capacity_pallets: String(resource?.capacity_pallets ?? 20),
    temp_min_c: String(resource?.temp_min_c ?? 0),
    temp_max_c: String(resource?.temp_max_c ?? 5),
    vessel_name: resource?.vessel_name ?? '',
    terminal: resource?.terminal ?? '',
    origin: resource?.origin ?? '',
    destination: resource?.destination ?? '',
    etd_date: etdDate,
    etd_time: etdTime,
    cutoff_date: cutoffDate,
    cutoff_time: cutoffTime,
    transit_days: String(resource?.transit_days ?? ''),
    enabled: resource?.enabled ?? true,
  };
};

const validate = (form: ResourceFormT, options: ResourceOptionsT) => {
  const errors: Partial<Record<TextFieldT, string>> = {};
  for (const field of ['name', 'vessel_name', 'terminal'] as const) {
    if (!form[field].trim()) errors[field] = '이 항목을 입력하세요.';
    else if (form[field].trim().length > 200) errors[field] = '200자 이내로 입력하세요.';
  }
  if (!options.container_kinds.includes(form.kind)) errors.kind = '컨테이너 종류를 선택하세요.';
  for (const field of ['origin', 'destination'] as const) {
    if (!options.ports.some(port => port.id === form[field])) errors[field] = '항구를 선택하세요.';
  }
  if (form.origin && form.origin === form.destination)
    errors.destination = '출발항과 다른 도착항을 선택하세요.';
  const capacity = Number(form.capacity_pallets);
  if (!form.capacity_pallets.trim() || !Number.isInteger(capacity) || capacity < 1 || capacity > 40)
    errors.capacity_pallets = '1~40 사이의 정수 파렛트를 입력하세요.';
  for (const field of ['temp_min_c', 'temp_max_c'] as const) {
    const value = Number(form[field]);
    if (!form[field].trim() || !Number.isFinite(value) || value < -100 || value > 100)
      errors[field] = '-100~100°C 사이의 온도를 입력하세요.';
  }
  if (!errors.temp_min_c && !errors.temp_max_c && Number(form.temp_min_c) > Number(form.temp_max_c))
    errors.temp_max_c = '최고 온도는 최저 온도 이상이어야 합니다.';
  const transit = Number(form.transit_days);
  if (!form.transit_days.trim() || !Number.isFinite(transit) || transit <= 0 || transit > 60)
    errors.transit_days = '0일 초과, 60일 이하로 입력하세요.';
  for (const field of ['etd_date', 'cutoff_date'] as const) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form[field])) errors[field] = '날짜를 선택하세요.';
  }
  for (const field of ['etd_time', 'cutoff_time'] as const) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form[field])) errors[field] = '시각을 입력하세요.';
  }
  if (
    !errors.etd_date &&
    !errors.etd_time &&
    !errors.cutoff_date &&
    !errors.cutoff_time &&
    new Date(timestamp(form.cutoff_date, form.cutoff_time)) >
      new Date(timestamp(form.etd_date, form.etd_time))
  )
    errors.cutoff_date = '반입 마감은 출항 예정 이전이어야 합니다.';
  return errors;
};

export function ResourceEditor({
  resource,
  options,
  onDone,
}: {
  resource: ResourceT | null;
  options: ResourceOptionsT;
  onDone: () => void;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(() => initialForm(resource));
  const [errors, setErrors] = useState<Partial<Record<TextFieldT, string>>>({});
  const save = useSaveResource();
  const update = (field: TextFieldT, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };
  const attributes = (field: TextFieldT) => ({
    id: `${id}-${field}`,
    'aria-invalid': !!errors[field],
    ...(errors[field] ? { 'aria-describedby': `${id}-${field}-error` } : {}),
  });
  const field = (key: TextFieldT, label: string, children: ReactNode) => (
    <div className="m2-field mb-0 min-w-0">
      <label htmlFor={`${id}-${key}`}>{label}</label>
      {children}
      {errors[key] && (
        <p id={`${id}-${key}-error`} className="mt-1 text-xs text-m2-crit">
          {errors[key]}
        </p>
      )}
    </div>
  );
  const text = (key: TextFieldT, label: string, type = 'text', step = 'any') =>
    field(
      key,
      label,
      <input
        {...attributes(key)}
        className="m2-inp w-full"
        type={type}
        step={step}
        value={form[key]}
        onChange={event => update(key, event.target.value)}
        maxLength={type === 'text' ? 200 : 20}
      />
    );
  const port = (key: 'origin' | 'destination', label: string) =>
    field(
      key,
      label,
      <Select value={form[key]} onValueChange={value => update(key, value)}>
        <SelectTrigger {...attributes(key)} className="m2-inp w-full">
          <SelectValue placeholder="항구 선택" />
        </SelectTrigger>
        <SelectContent>
          {options.ports.map(item => (
            <SelectItem key={item.id} value={item.id}>
              {item.name} ({item.unlocode || item.id})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  return (
    <>
      <DialogTitle>{resource ? '컨테이너 제공 정보 수정' : '가용 컨테이너 등록'}</DialogTitle>
      <DialogDescription>
        공동적재 계획에 사용할 공간과 항차 정보를 등록하세요. 모든 일정은 한국 시간(KST)입니다.
      </DialogDescription>
      <form
        ref={formRef}
        noValidate
        className="mt-3 flex min-w-0 flex-col gap-5"
        onSubmit={event => {
          event.preventDefault();
          if (save.isPending) return;
          const nextErrors = validate(form, options);
          setErrors(nextErrors);
          if (Object.values(nextErrors).some(Boolean)) {
            requestAnimationFrame(() =>
              formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
            );
            return;
          }
          const input: ResourceInputT = {
            name: form.name.trim(),
            kind: form.kind as ResourceInputT['kind'],
            capacity_pallets: Number(form.capacity_pallets),
            temp_min_c: Number(form.temp_min_c),
            temp_max_c: Number(form.temp_max_c),
            vessel_name: form.vessel_name.trim(),
            terminal: form.terminal.trim(),
            origin: form.origin,
            destination: form.destination,
            etd: timestamp(form.etd_date, form.etd_time),
            cy_cutoff: timestamp(form.cutoff_date, form.cutoff_time),
            transit_days: Number(form.transit_days),
            enabled: form.enabled,
          };
          save.mutate({ id: resource?.id ?? null, input }, { onSuccess: onDone });
        }}
      >
        <fieldset disabled={save.isPending} className="flex min-w-0 flex-col gap-5">
          <div className="grid min-w-0 gap-3 min-[600px]:grid-cols-2">
            {text('name', '관리 이름')}
            {field(
              'kind',
              '컨테이너 종류',
              <Select value={form.kind} onValueChange={value => update('kind', value)}>
                <SelectTrigger {...attributes('kind')} className="m2-inp w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.container_kinds.map(kind => (
                    <SelectItem key={kind} value={kind}>
                      {kind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {text('capacity_pallets', '제공 공간 (파렛트)', 'number', '1')}
            {text('transit_days', '해상 운송 기간 (일)', 'number')}
            {text('temp_min_c', '제공 가능한 최저 온도 (°C)', 'number')}
            {text('temp_max_c', '제공 가능한 최고 온도 (°C)', 'number')}
          </div>
          <p className="m2-sub -mt-2">
            관리 이름은 자원 구분용입니다. 실제 컨테이너 번호와 부킹 정보는 운송 실행 단계에서
            기록합니다.
          </p>
          <div className="border-t border-m2-line pt-4">
            <h3 className="m2-h3 mb-3">항차와 반입 일정</h3>
            <div className="grid min-w-0 gap-3 min-[600px]:grid-cols-2">
              {text('vessel_name', '선박 이름')}
              {text('terminal', '반입 터미널')}
              {port('origin', '출발항')}
              {port('destination', '도착항')}
              {field(
                'cutoff_date',
                '반입 마감일',
                <DatePicker
                  {...attributes('cutoff_date')}
                  className="m2-inp w-full"
                  value={form.cutoff_date}
                  onValueChange={value => update('cutoff_date', value)}
                />
              )}
              {text('cutoff_time', '반입 마감 시각 (KST)', 'time')}
              {field(
                'etd_date',
                '출항 예정일',
                <DatePicker
                  {...attributes('etd_date')}
                  className="m2-inp w-full"
                  value={form.etd_date}
                  onValueChange={value => update('etd_date', value)}
                />
              )}
              {text('etd_time', '출항 예정 시각 (KST)', 'time')}
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0"
              checked={form.enabled}
              onChange={event => setForm(prev => ({ ...prev, enabled: event.target.checked }))}
            />
            <span>공동적재 계산에 제공</span>
          </label>
        </fieldset>
        <p className="m2-note mt-0 text-xs">{options.allocation_notice}</p>
        {save.isError && (
          <p role="alert" className="text-sm text-m2-crit">
            {saasErrorReason(save.error) ??
              '저장하지 못했습니다. 입력 내용을 확인하고 다시 시도하세요.'}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-m2-line pt-4">
          <button
            type="button"
            className="m2-btn m2-btn-sec"
            disabled={save.isPending}
            onClick={onDone}
          >
            취소
          </button>
          <button type="submit" className="m2-btn m2-btn-pri" disabled={save.isPending}>
            {save.isPending ? '저장 중' : '저장'}
          </button>
        </div>
      </form>
    </>
  );
}
