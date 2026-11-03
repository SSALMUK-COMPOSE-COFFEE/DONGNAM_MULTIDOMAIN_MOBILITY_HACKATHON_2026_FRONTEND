import { LotsView } from '@/app/(saas)/app/shipper/_components/lots-view';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';

export const instant = false;

export default function ShipperLotsPage() {
  return (
    <>
      <ShipperPageHeader
        eyebrow="내 출하"
        title="출하 등록 · 목록"
        sub="다섯 가지만 넣으면 실을 수 있는 배를 바로 확인합니다. 계획에 들어가기 전까지 수정·취소할 수 있어요."
      />
      <LotsView />
    </>
  );
}
