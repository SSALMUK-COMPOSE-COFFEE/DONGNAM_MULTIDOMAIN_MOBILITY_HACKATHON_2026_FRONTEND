import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { SettlementView } from '@/app/(saas)/app/platform/settlements/_components/settlement-view';

export default function PlatformSettlementsPage() {
  return (
    <>
      <PlatformHeader
        eyebrow="플랫폼 운영 · 정산"
        headline="화주가 아낀 돈에서만"
        highlight="성과보수 25%"
      />
      <SettlementView />
    </>
  );
}
