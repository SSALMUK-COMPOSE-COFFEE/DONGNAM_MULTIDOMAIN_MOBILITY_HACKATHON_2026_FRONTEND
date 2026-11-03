import { RequestsView } from '@/app/(saas)/app/shipper/_components/requests-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export const instant = false;

export default function ShipperRequestsPage() {
  return (
    <>
      <ShipperPageHeader
        title="요청 응답"
        headline="바뀐 계획은"
        highlight="확정 한 번으로 끝납니다"
      />
      <RequestsView />
    </>
  );
}
