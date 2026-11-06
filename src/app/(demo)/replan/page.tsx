import { ReplanView } from '@/app/(demo)/replan/_components/replan-view';
import { PageHeader } from '@/app/_components/page-header';

export default function ReplanPage() {
  return (
    <>
      <PageHeader
        step="03"
        title="취소 재최적화"
        headline="화주가 빠지면 AI가"
        highlight="다시 짠다"
      />
      <ReplanView />
    </>
  );
}
