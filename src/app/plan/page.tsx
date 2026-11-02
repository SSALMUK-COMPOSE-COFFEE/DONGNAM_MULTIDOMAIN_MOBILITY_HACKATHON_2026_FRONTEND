import { PageHeader } from '@/app/_components/page-header';
import { PlanView } from '@/app/plan/_components/plan-view';

export default function PlanPage() {
  return (
    <>
      <PageHeader
        step="01"
        title="운송계획"
        description="여러 업체 출하를 한 계획으로 묶고 화주별 실제 절감액을 보여준다"
      />
      <PlanView />
    </>
  );
}
