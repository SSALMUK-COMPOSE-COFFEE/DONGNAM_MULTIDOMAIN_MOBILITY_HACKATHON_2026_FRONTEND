import type { Metadata } from 'next';

import { SaasLanding } from '@/components/saas-landing';

export const metadata: Metadata = {
  title: '프레시스위치 · 신선 농산물 공동적재 운송 관리',
};

export default function Page() {
  return <SaasLanding />;
}
