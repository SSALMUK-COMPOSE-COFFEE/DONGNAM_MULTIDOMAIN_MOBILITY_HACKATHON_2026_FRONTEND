import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { OnboardingView } from '@/app/(saas)/app/shipper/onboarding/_components/onboarding-view';

export const instant = false;

export default function ShipperOnboardingPage() {
  return (
    <>
      <ShipperPageHeader
        eyebrow="시작하기"
        title="선과장 등록"
        sub="출하를 모으는 선과장 한 곳만 알려주시면 바로 출하를 등록할 수 있어요."
      />
      <OnboardingView />
    </>
  );
}
