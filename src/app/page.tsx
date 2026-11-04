import type { Metadata } from 'next';

import { SaasLanding } from '@/components/saas-landing';

export const metadata: Metadata = {
  title: '프레시스위치 · 같이 타고, 바뀌면 다시 짠다',
};

export default function Page() {
  return <SaasLanding />;
}
