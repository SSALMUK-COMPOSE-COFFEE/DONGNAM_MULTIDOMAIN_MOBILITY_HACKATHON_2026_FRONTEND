import { PlansView } from '@/app/(saas)/app/shipper/_components/plans-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export const instant = false;

export default function ShipperPlansPage() {
  return (
    <>
      <ShipperPageHeader
        title="운송계획 확인"
        headline="내 출하가 실린"
        highlight="공동적재 계획"
      />
      <PlansView />
    </>
  );
}
