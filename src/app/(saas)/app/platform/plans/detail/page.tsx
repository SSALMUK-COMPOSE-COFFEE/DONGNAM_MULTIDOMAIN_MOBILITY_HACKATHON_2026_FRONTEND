import { Suspense } from 'react';

import { AdminPlanReview } from '@/app/(saas)/app/platform/_components/admin/admin-plan-review';
import { Skeleton } from '@/components/ui/skeleton';

export const instant = false;

export default function PlatformPlanDetailPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[18px]" />}>
      <AdminPlanReview />
    </Suspense>
  );
}
