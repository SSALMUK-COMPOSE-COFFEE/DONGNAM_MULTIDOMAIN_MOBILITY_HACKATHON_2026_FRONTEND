import { FuelShockView } from '@/app/(demo)/fuel-shock/_components/fuel-shock-view';
import { PageHeader } from '@/app/_components/page-header';

export default function FuelShockPage() {
  return (
    <>
      <PageHeader
        step="05"
        title="운임 쇼크"
        headline="항공 운임이 뛰면"
        highlight="계획이 바뀐다"
      />
      <FuelShockView />
    </>
  );
}
