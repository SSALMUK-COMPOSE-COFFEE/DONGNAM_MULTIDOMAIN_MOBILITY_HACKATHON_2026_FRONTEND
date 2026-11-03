import { PlatformKpiStrip } from '@/app/(saas)/app/platform/_components/kpi/kpi-strip';
import { NewPlanView } from '@/app/(saas)/app/platform/_components/new-plan-view';

export const instant = false;

export default function PlatformHomePage() {
  return <NewPlanView afterHeader={<PlatformKpiStrip />} />;
}
