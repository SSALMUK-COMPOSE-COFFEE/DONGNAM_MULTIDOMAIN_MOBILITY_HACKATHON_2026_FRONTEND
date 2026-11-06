import Link from 'next/link';

import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { BusinessPnlCard } from '@/app/(saas)/app/platform/settlements/_components/business-pnl-card';
import { BusinessYearsCard } from '@/app/(saas)/app/platform/settlements/_components/business-years-card';
import { RegionCard } from '@/app/(saas)/app/platform/settlements/_components/region-card';

export const instant = false;

export default function BusinessAnalysisPage() {
  return (
    <>
      <PlatformHeader
        eyebrow="정산"
        title="사업 분석"
        sub="운영 실적과 비용 가정을 바탕으로 계산한 전망입니다. 실제 청구·정산 금액과 다를 수 있습니다."
      >
        <Link href="/app/platform/settlements" className="m2-btn m2-btn-sec">
          정산 내역
        </Link>
      </PlatformHeader>
      <div className="m2-grid grid-cols-1">
        <BusinessPnlCard />
        <RegionCard />
        <BusinessYearsCard />
      </div>
    </>
  );
}
