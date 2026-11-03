import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { DeviceListCard } from '@/app/(saas)/app/platform/devices/_components/device-list-card';
import { RegisterDeviceCard } from '@/app/(saas)/app/platform/devices/_components/register-device-card';

export const instant = false;

export default function PlatformDevicesPage() {
  return (
    <>
      <PlatformHeader
        eyebrow="설정 · 온도 기기"
        title="콜드체인 센서를 등록하고 컨테이너에 연결합니다"
        sub="기기 토큰은 등록할 때 한 번만 보입니다."
      />
      <div className="flex flex-col gap-4">
        <RegisterDeviceCard />
        <DeviceListCard />
      </div>
    </>
  );
}
