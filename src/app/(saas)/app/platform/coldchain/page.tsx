import { Suspense } from 'react';

import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { ColdchainView } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-view';
import { Skeleton } from '@/components/ui/skeleton';

export const instant = false;

export default function PlatformColdchainPage() {
  return (
    <>
      <PlatformHeader
        eyebrow="플랫폼 운영 · 콜드체인 관제"
        headline="컨테이너 품온 · 전원을"
        highlight="실시간으로"
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ColdchainView />
      </Suspense>
    </>
  );
}
