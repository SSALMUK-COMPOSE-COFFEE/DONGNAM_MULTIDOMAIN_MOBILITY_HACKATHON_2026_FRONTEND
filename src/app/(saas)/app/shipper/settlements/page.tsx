import { SettlementsView } from '@/app/(saas)/app/shipper/_components/settlements-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export const instant = false;

export default function ShipperSettlementsPage() {
  return (
    <>
      <ShipperPageHeader
        eyebrow="정산"
        title="아낀 돈에서만 수수료를 냅니다"
        sub="혼자 항공으로 보냈을 때와 공동적재 비용의 차이가 절감액입니다."
      />
      <SettlementsView />
    </>
  );
}
