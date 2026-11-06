import { Suspense } from 'react';

import { CardSkeleton } from '@/app/(saas)/app/shipper/_components/query-state';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { ShipperColdchainView } from '@/app/(saas)/app/shipper/coldchain/_components/shipper-coldchain-view';

export const instant = false;

export default function ShipperColdchainPage() {
  return (
    <>
      <ShipperPageHeader
        eyebrow="콜드체인"
        title="내 화물 상태"
        sub="참여 계획 컨테이너의 품온 · 단전 · 내 로트 예상 손실"
      />
      <Suspense fallback={<CardSkeleton height={480} />}>
        <ShipperColdchainView />
      </Suspense>
    </>
  );
}
