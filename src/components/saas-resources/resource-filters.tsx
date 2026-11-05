'use client';

import { useId } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ResourceT } from '@/types/saas-resources';

export const filterResources = (resources: readonly ResourceT[], query: string, status: string) => {
  const normalized = query.trim().toLocaleLowerCase();
  return resources.filter(
    item =>
      (status === 'all' || item.status === status) &&
      `${item.name} ${item.vessel_name} ${item.forwarder_org_name} ${item.terminal}`
        .toLocaleLowerCase()
        .includes(normalized)
  );
};

export function ResourceFilters({
  query,
  status,
  onQueryChange,
  onStatusChange,
}: {
  query: string;
  status: string;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="m2-field mb-0 min-w-0 flex-1 basis-60">
        <label htmlFor={`${id}-search`}>컨테이너 검색</label>
        <input
          id={`${id}-search`}
          className="m2-inp w-full"
          type="search"
          placeholder="관리 이름, 선박, 포워더, 터미널"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
        />
      </div>
      <div className="m2-field mb-0 min-w-40">
        <label htmlFor={`${id}-status`}>제공 상태</label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger id={`${id}-status`} className="m2-inp w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="available">가용</SelectItem>
            <SelectItem value="allocated">계획 배정 중</SelectItem>
            <SelectItem value="disabled">이용 불가 · 제공 중지</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
