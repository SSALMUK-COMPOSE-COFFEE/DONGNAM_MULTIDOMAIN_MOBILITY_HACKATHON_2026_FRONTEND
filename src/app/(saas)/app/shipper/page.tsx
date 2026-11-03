import { ShipperHomeView } from '@/app/(saas)/app/shipper/_components/shipper-home-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export default function ShipperHomePage() {
  return (
    <>
      <ShipperPageHeader
        title="화주"
        headline="출하를 등록하고"
        highlight="운송계획을 확정합니다"
      />
      <ShipperHomeView />
    </>
  );
}
