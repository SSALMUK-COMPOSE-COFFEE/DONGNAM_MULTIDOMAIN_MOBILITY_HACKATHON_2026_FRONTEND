import { PageHeader } from '@/app/_components/page-header';
import { SensorView } from '@/app/sensor/_components/sensor-view';

export default function SensorPage() {
  return (
    <>
      <PageHeader
        step="03"
        title="단전 관제"
        description="냉각 박스 전원을 실제로 끊고, 관제 화면이 센서 값으로 반응하는 걸 보여준다"
      />
      <SensorView />
    </>
  );
}
