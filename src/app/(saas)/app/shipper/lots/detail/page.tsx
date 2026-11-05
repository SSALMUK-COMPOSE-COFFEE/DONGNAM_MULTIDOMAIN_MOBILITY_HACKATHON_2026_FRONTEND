import { Suspense } from 'react';

import { QuantityDetailView } from '@/app/(saas)/app/shipper/_components/quantity-detail-view';
import { CardSkeleton } from '@/app/(saas)/app/shipper/_components/query-state';

export const instant = false;

export default function Page() {
  return (
    <Suspense fallback={<CardSkeleton height={180} />}>
      <QuantityDetailView />
    </Suspense>
  );
}
