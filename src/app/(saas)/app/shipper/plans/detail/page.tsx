import { Suspense } from 'react';

import { PlanDetailView } from '@/app/(saas)/app/shipper/_components/plan-detail-view';
import { CardSkeleton } from '@/app/(saas)/app/shipper/_components/query-state';

export const instant = false;

export default function ShipperPlanDetailPage() {
  return (
    <Suspense fallback={<CardSkeleton height={480} />}>
      <PlanDetailView />
    </Suspense>
  );
}
