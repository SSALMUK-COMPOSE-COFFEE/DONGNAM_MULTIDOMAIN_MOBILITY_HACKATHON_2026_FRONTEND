'use client';

import { cn } from 'cn';
import Link from 'next/link';
import { useState } from 'react';

import { useForwarderContainer, useForwarderContainers } from '@/apis/saas/forwarder';
import {
  NO_READING_TEXT,
  TWIN_STATUS,
  TwinBody,
  TwinChips,
} from '@/app/(saas)/app/forwarder/_components/coldchain-twin';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import { QueryError } from '@/app/(saas)/app/forwarder/_components/query-state';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';

type VoyageColdchainCardPropsT = {
  planId: string;
  planContainerIds: string[];
};

export function VoyageColdchainCard({ planId, planContainerIds }: VoyageColdchainCardPropsT) {
  const containers = useForwarderContainers(planId);
  const [picked, setPicked] = useState<string | null>(null);
  const summaries = containers.data ?? [];
  const containerIds = [
    ...new Set([...planContainerIds, ...summaries.map(({ container_id }) => container_id)]),
  ];
  const containerId = picked && containerIds.includes(picked) ? picked : (containerIds[0] ?? null);

  return (
    <section className="m2-card mt-4">
      {containers.isError ? (
        <QueryError
          className="mb-3"
          message="컨테이너 상태를 불러오지 못했습니다."
          onRetry={() => containers.refetch()}
          isRetrying={containers.isFetching}
        />
      ) : null}
      {containerIds.length > 1 ? (
        <div role="tablist" aria-label="컨테이너" className="mb-3 flex flex-wrap gap-1.5">
          {containerIds.map(id => {
            const status =
              TWIN_STATUS[
                summaries.find(({ container_id }) => container_id === id)?.status ?? 'no_data'
              ];
            const isActive = id === containerId;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setPicked(id)}
                className={cn('m2-btn m2-btn-sm', isActive ? 'm2-btn-pri' : 'm2-btn-sec')}
              >
                <span className="m2-dot" style={{ color: status.color }} aria-hidden />
                <span className="m2-mono">{id}</span>
              </button>
            );
          })}
        </div>
      ) : null}
      {containerId ? (
        <SectionErrorBoundary message="품온 정보를 그리지 못했습니다." className="h-72">
          <ContainerTwinSection planId={planId} containerId={containerId} />
        </SectionErrorBoundary>
      ) : (
        <>
          <h2 className="m2-h2">콜드체인</h2>
          {containers.isPending ? (
            <Skeleton className="mt-3 h-48 rounded-[14px]" />
          ) : (
            <p className="m2-sub">품온을 볼 컨테이너가 없습니다.</p>
          )}
        </>
      )}
    </section>
  );
}

function ContainerTwinSection({ planId, containerId }: { planId: string; containerId: string }) {
  const twin = useForwarderContainer(planId, containerId);

  return (
    <>
      <div className="m2-card-h flex-wrap">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m2-h2">{containerId} 콜드체인</h2>
          {twin.data ? <TwinChips twin={twin.data} /> : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-m2-muted max-[900px]:hidden">
            차트 위를 움직이면 시각별 품온
          </span>
          <Link
            href={FORWARDER_PATHS.COLDCHAIN(planId, containerId)}
            className="m2-btn m2-btn-sec m2-btn-sm"
          >
            실시간 알림 보기
          </Link>
        </div>
      </div>
      {twin.isPending ? <Skeleton className="h-52 rounded-[14px]" /> : null}
      {twin.isError ? (
        <QueryError
          message={`${containerId} 품온 정보를 불러오지 못했습니다.`}
          onRetry={() => twin.refetch()}
          isRetrying={twin.isFetching}
        />
      ) : null}
      {twin.isSuccess && twin.data ? <TwinBody twin={twin.data} containerId={containerId} /> : null}
      {twin.isSuccess && !twin.data ? (
        <p className="m2-sub py-6 text-center">{NO_READING_TEXT}</p>
      ) : null}
    </>
  );
}
