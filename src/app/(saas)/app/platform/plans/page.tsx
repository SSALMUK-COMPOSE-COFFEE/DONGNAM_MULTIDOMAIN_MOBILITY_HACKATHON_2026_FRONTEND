import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { PlanListView } from '@/app/(saas)/app/platform/plans/_components/plan-list-view';

export const instant = false;

export default function PlatformPlansPage() {
  return (
    <>
      <PlatformHeader
        eyebrow="플랫폼 운영 · 공동적재 계획"
        headline="항차별 공동적재 계획과"
        highlight="포워더 배정"
      />
      <PlanListView />
    </>
  );
}
