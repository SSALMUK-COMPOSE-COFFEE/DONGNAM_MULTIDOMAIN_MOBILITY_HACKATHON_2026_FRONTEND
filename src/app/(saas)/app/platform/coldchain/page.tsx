import { Suspense } from 'react';

import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { ColdchainView } from '@/app/(saas)/app/platform/coldchain/_components/coldchain-view';
import { Skeleton } from '@/components/ui/skeleton';

export const instant = false;

export default function PlatformColdchainPage() {
  return (
    <>
      <PlatformHeader
        eyebrow="콜드체인 관제"
        title="컨테이너 품온 · 전원을 실시간으로"
        sub="센서 측정값, 자동 조치, 알림 스트림을 계획의 컨테이너별로 봅니다."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-[18px]" />}>
        <ColdchainView />
      </Suspense>
    </>
  );
}
