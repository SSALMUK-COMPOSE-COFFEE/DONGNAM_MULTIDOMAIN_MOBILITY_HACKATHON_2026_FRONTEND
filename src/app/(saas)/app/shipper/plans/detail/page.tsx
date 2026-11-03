import { Suspense } from 'react';

import { PlanDetailView } from '@/app/(saas)/app/shipper/_components/plan-detail-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { Skeleton } from '@/components/ui/skeleton';

export const instant = false;

export default function ShipperPlanDetailPage() {
  return (
    <>
      <ShipperPageHeader title="운송계획 상세" headline="내 파렛트와" highlight="절감액" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <PlanDetailView />
      </Suspense>
    </>
  );
}
