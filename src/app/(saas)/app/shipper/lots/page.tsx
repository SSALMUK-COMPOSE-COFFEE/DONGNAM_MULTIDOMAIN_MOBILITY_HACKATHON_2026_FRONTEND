import { Suspense } from 'react';

import { LotsView } from '@/app/(saas)/app/shipper/_components/lots-view';
import { CardSkeleton } from '@/app/(saas)/app/shipper/_components/query-state';

export const instant = false;

export default function ShipperLotsPage() {
  return (
    <Suspense fallback={<CardSkeleton height={240} />}>
      <LotsView />
    </Suspense>
  );
}
