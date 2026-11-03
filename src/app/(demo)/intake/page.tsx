import { PageHeader } from '@/app/(demo)/_components/page-header';
import { IntakeView } from '@/app/(demo)/intake/_components/intake-view';

export default function IntakePage() {
  return (
    <>
      <PageHeader step="01" title="출하 입력" headline="화주는 다섯 칸만" highlight="채운다" />
      <IntakeView />
    </>
  );
}
