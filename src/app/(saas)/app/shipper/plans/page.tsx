import { PlansView } from '@/app/(saas)/app/shipper/_components/plans-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export const instant = false;

export default function ShipperPlansPage() {
  return (
    <>
      <ShipperPageHeader
        eyebrow="계획 확정"
        title="내 출하가 실린 공동적재 계획"
        sub="계획이 바뀌면 여기서 확인하고 확정합니다."
      />
      <PlansView />
    </>
  );
}
