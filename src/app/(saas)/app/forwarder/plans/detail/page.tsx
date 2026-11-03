import { Suspense } from 'react';

import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import { PlanDetailView } from '@/app/(saas)/app/forwarder/_components/plan-detail-view';
import { Skeleton } from '@/components/ui/skeleton';

export const instant = false;

export default function ForwarderPlanDetailPage() {
  return (
    <>
      <ForwarderPageHeader title="항차 상세" headline="선과장 집하 경로와" highlight="실행 지시" />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <PlanDetailView />
      </Suspense>
    </>
  );
}
