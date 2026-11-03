import { Suspense } from 'react';

import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { PlanDetailView } from '@/app/(saas)/app/platform/plans/detail/_components/plan-detail-view';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlatformPlanDetailPage() {
  return (
    <>
      <PlatformHeader
        eyebrow="플랫폼 운영 · 계획 상세"
        headline="컨테이너 배정 · 집하 경로 ·"
        highlight="재최적화"
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <PlanDetailView />
      </Suspense>
    </>
  );
}
