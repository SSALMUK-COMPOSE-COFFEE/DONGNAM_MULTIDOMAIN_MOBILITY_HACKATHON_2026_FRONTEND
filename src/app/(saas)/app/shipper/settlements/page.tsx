import { SettlementsView } from '@/app/(saas)/app/shipper/_components/settlements-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export const instant = false;

export default function ShipperSettlementsPage() {
  return (
    <>
      <ShipperPageHeader
        eyebrow="정산"
        title="내가 아낀 금액과 낸 수수료"
        sub="혼자 보냈을 때와 공동적재 비용의 차이가 절감액입니다. 계획마다 과금 방식(성과보수·파렛트 이용료)과 비교 기준을 적었습니다."
      />
      <SettlementsView />
    </>
  );
}
