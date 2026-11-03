import { Suspense } from 'react';

import { ColdchainView } from '@/app/(saas)/app/forwarder/_components/coldchain-view';
import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import { Skeleton } from '@/components/ui/skeleton';

export const instant = false;

export default function ForwarderColdchainPage() {
  return (
    <>
      <ForwarderPageHeader
        title="콜드체인 조회"
        headline="운송 중인 컨테이너의"
        highlight="품온 · 전원"
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ColdchainView />
      </Suspense>
    </>
  );
}
