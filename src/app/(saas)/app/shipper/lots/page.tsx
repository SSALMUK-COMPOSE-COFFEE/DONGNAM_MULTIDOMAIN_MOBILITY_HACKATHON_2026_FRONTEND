import { LotsView } from '@/app/(saas)/app/shipper/_components/lots-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export const instant = false;

export default function ShipperLotsPage() {
  return (
    <>
      <ShipperPageHeader
        title="출하 등록 · 목록"
        headline="다섯 가지만 넣으면"
        highlight="실을 배를 바로 확인합니다"
      />
      <LotsView />
    </>
  );
}
