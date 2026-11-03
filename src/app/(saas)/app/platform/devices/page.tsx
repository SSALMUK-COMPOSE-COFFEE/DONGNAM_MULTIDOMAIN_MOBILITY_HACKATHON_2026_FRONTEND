import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { DeviceListCard } from '@/app/(saas)/app/platform/devices/_components/device-list-card';
import { RegisterDeviceCard } from '@/app/(saas)/app/platform/devices/_components/register-device-card';

export default function PlatformDevicesPage() {
  return (
    <>
      <PlatformHeader
        eyebrow="플랫폼 운영 · 기기 관리"
        headline="콜드체인 센서를 등록하고"
        highlight="컨테이너에 연결합니다"
      />
      <div className="flex flex-col gap-6">
        <RegisterDeviceCard />
        <DeviceListCard />
      </div>
    </>
  );
}
