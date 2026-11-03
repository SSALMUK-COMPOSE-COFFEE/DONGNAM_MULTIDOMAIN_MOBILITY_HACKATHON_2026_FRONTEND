'use client';

import { toast } from 'sonner';

import { saasErrorReason } from '@/apis/saas/errors';
import { useCreateShipperLot, useShipperCatalog, useShipperOrgId } from '@/apis/saas/shipper';
import { toIntakeOptions, todayIso } from '@/app/(saas)/app/shipper/_components/catalog';
import { LotTable } from '@/app/(saas)/app/shipper/_components/lot-table';
import {
  EmptyState,
  QueryError,
  toFieldErrors,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { IntakeForm } from '@/components/intake-form';
import { IntakePreview } from '@/components/intake-preview';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import type { IntakeRequestT } from '@/types/api';
import type { ShipperCatalogT } from '@/types/saas-shipper';

const initialIntakeOf = (catalog: ShipperCatalogT): IntakeRequestT => {
  const options = toIntakeOptions(catalog);

  return {
    product: options.products[0]?.id ?? '',
    pallets: 1,
    ready_date: todayIso(),
    shipper: options.shippers[0]?.id ?? '',
    destination: options.destinations[0]?.id ?? '',
    sell_by_date: null,
    sell_window: 'normal',
    scenario_id: catalog.id,
    plan_id: null,
    lot_id: null,
  };
};

export function LotsView() {
  const orgId = useShipperOrgId();
  const catalog = useShipperCatalog();
  const createLot = useCreateShipperLot();

  return (
    <div className="@container flex flex-col gap-6">
      <SectionErrorBoundary message="출하 등록 영역을 그리지 못했습니다." className="h-96">
        {catalog.isError && (
          <QueryError
            message="품목·선과장 정보를 불러오지 못했습니다."
            onRetry={() => catalog.refetch()}
            isRetrying={catalog.isFetching}
          />
        )}
        {catalog.isPending && <Skeleton className="h-96" />}
        {catalog.data && catalog.data.shippers.length === 0 && (
          <EmptyState
            title="조직에 등록된 화주 · 선과장 정보가 없습니다"
            description="플랫폼에 화주 프로필과 선과장 등록을 요청하세요."
          />
        )}
        {catalog.data && catalog.data.shippers.length > 0 && (
          <div className="grid grid-cols-1 gap-6 @min-[1000px]:grid-cols-[480px_minmax(0,1fr)]">
            <IntakeForm
              key={`${orgId}:${catalog.data.id}`}
              scenario={catalog.data}
              isPending={createLot.isPending}
              fieldErrors={toFieldErrors(createLot.error)}
              initialValues={initialIntakeOf(catalog.data)}
              options={toIntakeOptions(catalog.data)}
              hideShipperField={catalog.data.shippers.length <= 1}
              onSubmit={request =>
                createLot.mutate(request, {
                  onSuccess: preview => toast.success(`${preview.lot.id} 출하를 등록했습니다.`),
                  onError: error => {
                    if (toFieldErrors(error).length === 0)
                      toast.error('출하를 등록하지 못했습니다.', {
                        description: saasErrorReason(error),
                      });
                  },
                })
              }
            />
            <IntakePreview preview={createLot.data ?? null} />
          </div>
        )}
      </SectionErrorBoundary>

      <SectionErrorBoundary message="출하 목록을 그리지 못했습니다." className="h-64">
        <LotTable catalog={catalog.data ?? null} />
      </SectionErrorBoundary>
    </div>
  );
}
