'use client';

import { TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';

import { useShipperCatalog, useShipperOrgId } from '@/apis/saas/shipper';
import { useShipperProfile } from '@/apis/saas/shipper-profile';
import { IntakeResultCard } from '@/app/(saas)/app/shipper/_components/intake-result-card';
import { seasonWarningsOf } from '@/app/(saas)/app/shipper/_components/labels';
import { LotTable } from '@/app/(saas)/app/shipper/_components/lot-table';
import { plainWords } from '@/app/(saas)/app/shipper/_components/plain-words';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { ShipperLotForm } from '@/app/(saas)/app/shipper/_components/shipper-lot-form';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import type { ShipperLotPreviewT } from '@/types/saas-shipper';

const RAW_LOT_DEFAULT = /\blot_id\b/;
const NO_PRODUCTS: string[] = [];

const shipperFacing = (preview: ShipperLotPreviewT): ShipperLotPreviewT => ({
  ...preview,
  defaults_applied: preview.defaults_applied
    .filter(item => !RAW_LOT_DEFAULT.test(item))
    .map(item => item.replace(/\bsell_by_date\b/g, '판매기한')),
});

function SeasonNotice({ preview }: { preview: ShipperLotPreviewT | null }) {
  const warnings = preview ? seasonWarningsOf(preview) : [];

  return (
    <div role="status" className={warnings.length > 0 ? 'm2-note m2-note-warn mt-0' : 'sr-only'}>
      {warnings.length > 0 && (
        <>
          <TriangleAlertIcon size={14} aria-hidden />
          <div>
            <b className="block">수출 시기 밖 출하</b>
            {plainWords(warnings.join(' · '))}
          </div>
        </>
      )}
    </div>
  );
}

export function LotsView() {
  const orgId = useShipperOrgId();
  const catalog = useShipperCatalog();
  const profile = useShipperProfile();
  const preferredProductIds = profile.data?.profile?.product_ids ?? NO_PRODUCTS;
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
              title="먼저 선과장을 등록하세요"
              description="출하를 모으는 선과장의 이름·주소·위치·취급 품목을 알려주시면 바로 출하를 등록할 수 있어요."
              action={{ href: SHIPPER_PATHS.ONBOARDING, label: '선과장 등록하기' }}
            />
          </div>
        )}
        {catalog.data && catalog.data.shippers.length > 0 && (
          <div className="m2-grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] max-[1180px]:grid-cols-1">
            <ShipperLotForm
              key={`${formKey}:${preferredProductIds.join(',')}`}
              catalog={catalog.data}
              preferredProductIds={preferredProductIds}
              onCreated={preview => setCreated({ key: formKey, preview })}
            />
            <div className="flex min-w-0 flex-col gap-4">
              <SeasonNotice preview={created?.key === formKey ? created.preview : null} />
              <IntakeResultCard
                preview={created?.key === formKey ? shipperFacing(created.preview) : null}
              />
            </div>
          </div>
        )}
      </SectionErrorBoundary>

      <SectionErrorBoundary message="출하 목록을 그리지 못했습니다." className="h-64">
        <LotTable catalog={catalog.data ?? null} />
      </SectionErrorBoundary>
    </div>
  );
}
