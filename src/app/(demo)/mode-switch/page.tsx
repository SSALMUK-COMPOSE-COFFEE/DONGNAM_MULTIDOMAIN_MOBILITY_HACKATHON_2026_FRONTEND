import { ModeSwitchView } from '@/app/(demo)/mode-switch/_components/mode-switch-view';
import { PageHeader } from '@/app/_components/page-header';

export default function ModeSwitchPage() {
  return (
    <>
      <PageHeader
        step="04"
        title="항공 전환"
        headline="팔 시간이 모자라면"
        highlight="항공으로 바꾼다"
      />
      <ModeSwitchView />
    </>
  );
}
