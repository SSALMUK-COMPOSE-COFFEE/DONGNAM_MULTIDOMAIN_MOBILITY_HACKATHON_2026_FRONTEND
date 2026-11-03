import { SettlementsView } from '@/app/(saas)/app/shipper/_components/settlements-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export const instant = false;

export default function ShipperSettlementsPage() {
  return (
    <>
      <ShipperPageHeader
        title="절감액 · 정산"
        headline="아낀 돈에서만"
        highlight="수수료를 냅니다"
      />
      <SettlementsView />
    </>
  );
}
