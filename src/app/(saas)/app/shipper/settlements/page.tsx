import { SettlementsView } from '@/app/(saas)/app/shipper/_components/settlements-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export const instant = false;

export default function ShipperSettlementsPage() {
  return (
    <>
      <ShipperPageHeader
        eyebrow="예상 정산"
        title="운송계획 기준 예상 정산"
        sub="계획 기준 예상 운송비·절감액·수수료와 수량 조정 운임 내역을 확인합니다. 검수 입력이 있으면 환급 계산액을 반영합니다."
      />
      <SettlementsView />
    </>
  );
}
