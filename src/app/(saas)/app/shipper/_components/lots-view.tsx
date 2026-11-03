'use client';

import { useState } from 'react';

import { useShipperCatalog, useShipperOrgId } from '@/apis/saas/shipper';
import { IntakeResultCard } from '@/app/(saas)/app/shipper/_components/intake-result-card';
import { LotTable } from '@/app/(saas)/app/shipper/_components/lot-table';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { ShipperLotForm } from '@/app/(saas)/app/shipper/_components/shipper-lot-form';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import type { ShipperLotPreviewT } from '@/types/saas-shipper';

export function LotsView() {
  const orgId = useShipperOrgId();
  const catalog = useShipperCatalog();
  const [created, setCreated] = useState<{ key: string; preview: ShipperLotPreviewT } | null>(null);
  const formKey = catalog.data ? `${orgId}:${catalog.data.id}` : '';

  return (
    <div className="flex flex-col gap-4">
      <SectionErrorBoundary message="출하 등록 영역을 그리지 못했습니다." className="h-96">
        {catalog.isError && (
          <QueryError
            message="품목·선과장 정보를 불러오지 못했습니다."
            onRetry={() => catalog.refetch()}
            isRetrying={catalog.isFetching}
          />
        )}
        {catalog.isPending && <CardSkeleton height={620} />}
        {catalog.data && catalog.data.shippers.length === 0 && (
          <div className="m2-card">
            <EmptyState
              title="조직에 등록된 화주 · 선과장 정보가 없습니다"
              description="플랫폼에 화주 프로필과 선과장 등록을 요청하세요."
            />
          </div>
        )}
        {catalog.data && catalog.data.shippers.length > 0 && (
          <div className="m2-grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] max-[1180px]:grid-cols-1">
            <ShipperLotForm
              key={formKey}
              catalog={catalog.data}
              onCreated={preview => setCreated({ key: formKey, preview })}
            />
            <IntakeResultCard preview={created?.key === formKey ? created.preview : null} />
          </div>
        )}
      </SectionErrorBoundary>

      <SectionErrorBoundary message="출하 목록을 그리지 못했습니다." className="h-64">
        <LotTable catalog={catalog.data ?? null} />
      </SectionErrorBoundary>
    </div>
  );
}
