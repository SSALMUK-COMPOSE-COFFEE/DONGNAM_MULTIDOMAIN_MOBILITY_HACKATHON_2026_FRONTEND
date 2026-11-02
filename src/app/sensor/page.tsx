import { PageHeader } from '@/app/_components/page-header';
import { SensorView } from '@/app/sensor/_components/sensor-view';

export default function SensorPage() {
  return (
    <>
      <PageHeader
        step="03"
        title="단전 관제"
        headline="전원이 끊기면 손실이"
        highlight="바로 보인다"
      />
      <SensorView />
    </>
  );
}
