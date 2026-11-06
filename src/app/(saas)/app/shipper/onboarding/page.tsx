import { Suspense } from 'react';

import { CardSkeleton } from '@/app/(saas)/app/shipper/_components/query-state';
import { OnboardingView } from '@/app/(saas)/app/shipper/onboarding/_components/onboarding-view';

export const instant = false;

export default function ShipperOnboardingPage() {
  return (
    <Suspense fallback={<CardSkeleton height={520} />}>
      <OnboardingView />
    </Suspense>
  );
}
