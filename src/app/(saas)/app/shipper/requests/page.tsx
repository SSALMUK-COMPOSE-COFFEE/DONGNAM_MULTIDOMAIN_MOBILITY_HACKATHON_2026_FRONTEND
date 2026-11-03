import { RequestsView } from '@/app/(saas)/app/shipper/_components/requests-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export const instant = false;

export default function ShipperRequestsPage() {
  return (
    <>
      <ShipperPageHeader
        eyebrow="요청 응답"
        title="바뀐 계획은 확정 한 번으로 끝납니다"
        sub="실행 지시와 선사·터미널 요청의 진행 상태를 모아 봅니다."
      />
      <RequestsView />
    </>
  );
}
