import { Suspense } from 'react';

import { PlanDetailView } from '@/app/(saas)/app/platform/plans/detail/_components/plan-detail-view';
import { Skeleton } from '@/components/ui/skeleton';

export const instant = false;

export default function PlatformPlanDetailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[18px]" />}>
      <PlanDetailView />
    </Suspense>
  );
}
