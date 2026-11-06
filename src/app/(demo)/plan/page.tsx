import { PlanView } from '@/app/(demo)/plan/_components/plan-view';
import { PageHeader } from '@/app/_components/page-header';

export default function PlanPage() {
  return (
    <>
      <PageHeader
        step="02"
        title="운송계획"
        headline="출하 5건을 한 계획으로."
        highlight="실제 절감액까지"
      />
      <PlanView />
    </>
  );
}
