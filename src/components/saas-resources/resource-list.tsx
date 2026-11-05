'use client';

import Link from 'next/link';

import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import { PLATFORM_PATHS } from '@/app/(saas)/app/platform/_components/paths';
import type { ResourceOptionsT, ResourceT } from '@/types/saas-resources';

const STATUS_LABEL: Record<ResourceT['status'], string> = {
  available: '가용',
  allocated: '계획 배정 중',
  disabled: '이용 불가',
};

export const resourceTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));

export function ResourcesSummary({ resources }: { resources: readonly ResourceT[] }) {
  const available = resources.filter(item => item.status === 'available');
  const stats = [
    { label: '가용 컨테이너', value: available.length, unit: '개' },
    {
      label: '제공 가능한 공간',
      value: available.reduce((sum, item) => sum + item.available_pallets, 0),
      unit: '파렛트',
    },
    {
      label: '계획 배정 중',
      value: resources.filter(item => item.status === 'allocated').length,
      unit: '개',
    },
  ];
  return (
    <dl className="mb-5 grid gap-3 min-[650px]:grid-cols-3" aria-label="컨테이너 제공 현황">
      {stats.map(item => (
        <div key={item.label} className="m2-card">
          <dt className="m2-lbl">{item.label}</dt>
          <dd className="m2-num mt-2 text-2xl font-bold">
            {item.value.toLocaleString('ko-KR')}{' '}
            <span className="text-sm font-medium text-m2-muted">{item.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ResourceList({
  resources,
  ports,
  role,
  onEdit,
  onDelete,
}: {
  resources: readonly ResourceT[];
  ports: ResourceOptionsT['ports'];
  role: 'forwarder' | 'platform';
  onEdit?: (resource: ResourceT) => void;
  onDelete?: (resource: ResourceT) => void;
}) {
  const portName = (id: string) => ports.find(port => port.id === id)?.name ?? id;
  return (
    <div className="grid gap-4 min-[1200px]:grid-cols-2">
      {resources.map(resource => (
        <article
          key={resource.id}
          className="m2-card flex min-w-0 flex-col gap-4"
          aria-label={resource.name}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="m2-h2 break-words">{resource.name}</h2>
              {role === 'platform' && (
                <p className="m2-sub mt-1 break-words">{resource.forwarder_org_name}</p>
              )}
              <p className="m2-sub mt-1">
                {resource.kind} · {resource.temp_min_c}~{resource.temp_max_c}°C
              </p>
            </div>
            <span
              className={`m2-chip shrink-0 ${resource.status === 'available' ? 'm2-chip-ok' : 'm2-chip-brand'}`}
            >
              {resource.status === 'disabled' && !resource.enabled
                ? '제공 중지'
                : STATUS_LABEL[resource.status]}
            </span>
          </div>
          <div className="rounded-xl bg-m2-brand-soft px-3 py-2.5">
            <p className="m2-num text-sm font-semibold">
              제공 공간 {resource.capacity_pallets}파렛트
              <span className="ml-2 font-normal text-m2-muted">
                현재 가용 {resource.available_pallets}파렛트
              </span>
            </p>
            {resource.status === 'allocated' && (
              <p className="m2-sub mt-1">
                이 계획에서 사용 {resource.allocated_pallets}파렛트 · 다른 계획에 중복 배정하지
                않습니다.
              </p>
            )}
          </div>
          <dl className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
            <dt className="text-m2-muted">항로</dt>
            <dd className="break-words">
              {portName(resource.origin)} → {portName(resource.destination)}
            </dd>
            <dt className="text-m2-muted">선박</dt>
            <dd className="break-words">{resource.vessel_name}</dd>
            <dt className="text-m2-muted">반입 터미널</dt>
            <dd className="break-words">{resource.terminal}</dd>
            <dt className="text-m2-muted">반입 마감</dt>
            <dd className="m2-num">{resourceTime(resource.cy_cutoff)}</dd>
            <dt className="text-m2-muted">출항 예정</dt>
            <dd className="m2-num">{resourceTime(resource.etd)}</dd>
            <dt className="text-m2-muted">해상 운송</dt>
            <dd className="m2-num">{resource.transit_days}일</dd>
          </dl>
          {resource.allocated_plan_id && (
            <div className="mt-auto rounded-xl border border-m2-line px-3 py-2.5">
              <p className="m2-sub mb-1">
                공동적재 계획에 배정되었습니다. 선사 부킹 완료를 뜻하지 않습니다.
              </p>
              <Link
                className="text-sm font-semibold text-m2-brand-ink underline-offset-4 hover:underline"
                href={
                  role === 'forwarder'
                    ? FORWARDER_PATHS.PLAN(resource.allocated_plan_id)
                    : PLATFORM_PATHS.PLAN(resource.allocated_plan_id)
                }
              >
                배정 계획 보기
              </Link>
            </div>
          )}
          {role === 'forwarder' && (
            <div className="mt-auto border-t border-m2-line pt-3">
              {resource.status === 'allocated' && (
                <p className="m2-sub mb-2">
                  계획에 배정된 동안 제공 정보를 수정하거나 삭제할 수 없습니다.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="m2-btn m2-btn-sec m2-btn-sm"
                  disabled={resource.status === 'allocated'}
                  onClick={() => onEdit?.(resource)}
                  aria-label={`${resource.name} 수정`}
                >
                  수정
                </button>
                <button
                  type="button"
                  className="m2-btn m2-btn-sec m2-btn-sm"
                  disabled={resource.status === 'allocated'}
                  onClick={() => onDelete?.(resource)}
                  aria-label={`${resource.name} 삭제`}
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
