'use client';

import { useState } from 'react';

import { useResourceOptions, useResources } from '@/apis/saas/resources';
import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { ResourceFilters, filterResources } from '@/components/saas-resources/resource-filters';
import { ResourceList, ResourcesSummary } from '@/components/saas-resources/resource-list';

export function PlatformResourcesView() {
  const resources = useResources('platform');
  const options = useResourceOptions();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const filtered = filterResources(resources.data ?? [], query, status);
  return (
    <>
      <PlatformHeader
        eyebrow="서비스 관리"
        title="컨테이너 현황"
        sub="포워더가 등록한 컨테이너 공간과 제공 일정을 조회합니다."
      />
      <p className="m2-sub mb-4">
        자원 등록과 수정은 제공 포워더가 담당합니다. 계획 배정은 실제 부킹 완료를 뜻하지 않습니다.
        모든 일정은 한국 시간(KST)입니다.
      </p>
      {(resources.isPending || options.isPending) && <CardSkeleton height={280} />}
      {resources.isError && (
        <QueryError
          message="포워더 제공 자원을 불러오지 못했습니다."
          onRetry={() => resources.refetch()}
          isRetrying={resources.isFetching}
        />
      )}
      {options.isError && (
        <QueryError
          message="항구 정보를 불러오지 못했습니다."
          onRetry={() => options.refetch()}
          isRetrying={options.isFetching}
        />
      )}
      {resources.isSuccess && options.isSuccess && (
        <>
          <ResourcesSummary resources={resources.data} />
          <p className="m2-note mt-0 mb-4">{options.data.allocation_notice}</p>
          <ResourceFilters
            query={query}
            status={status}
            onQueryChange={setQuery}
            onStatusChange={setStatus}
          />
          {filtered.length ? (
            <ResourceList resources={filtered} ports={options.data.ports} role="platform" />
          ) : (
            <EmptyState
              title={resources.data.length ? '검색 결과가 없습니다' : '등록된 제공 자원이 없습니다'}
              description={
                resources.data.length
                  ? '검색어나 상태를 바꿔 보세요.'
                  : '포워더가 컨테이너 공간과 항차 일정을 등록하면 여기에 표시됩니다.'
              }
            />
          )}
        </>
      )}
    </>
  );
}
