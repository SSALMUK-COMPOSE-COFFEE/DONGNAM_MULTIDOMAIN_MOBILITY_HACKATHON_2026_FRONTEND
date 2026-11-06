import { Suspense } from 'react';

import { ColdchainView } from '@/app/(saas)/app/forwarder/_components/coldchain-view';
import { Skeleton } from '@/components/ui/skeleton';

export const instant = false;

export default function ForwarderColdchainPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[18px]" />}>
      <ColdchainView />
    </Suspense>
  );
}
