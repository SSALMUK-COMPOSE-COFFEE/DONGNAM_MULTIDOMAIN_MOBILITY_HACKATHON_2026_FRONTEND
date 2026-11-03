import { LotPoolView } from '@/app/(saas)/app/platform/_components/lot-pool-view';
import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';

export const instant = false;

export default function PlatformHomePage() {
  return (
    <>
      <PlatformHeader
        eyebrow="플랫폼 운영 · 출하 현황"
        headline="플랫폼에 올라온 모든 화주 출하를"
        highlight="한 번에 묶습니다"
      />
      <LotPoolView />
    </>
  );
}
