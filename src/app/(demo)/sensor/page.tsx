import { PageHeader } from '@/app/(demo)/_components/page-header';
import { SensorView } from '@/app/(demo)/sensor/_components/sensor-view';

export default function SensorPage() {
  return (
    <>
      <PageHeader
        step="부록"
        title="단전 관제"
        headline="전원이 끊기면 손실이"
        highlight="바로 보인다"
      />
      <SensorView />
    </>
  );
}
