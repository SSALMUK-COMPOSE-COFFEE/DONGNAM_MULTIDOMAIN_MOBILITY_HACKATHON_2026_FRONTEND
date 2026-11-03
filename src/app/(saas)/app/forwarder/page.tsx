import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import { PlansView } from '@/app/(saas)/app/forwarder/_components/plans-view';

export default function ForwarderHomePage() {
  return (
    <>
      <ForwarderPageHeader
        title="포워더"
        headline="배정된 항차의 실행 지시를"
        highlight="확정합니다"
      />
      <PlansView />
    </>
  );
}
