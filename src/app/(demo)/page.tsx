import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ROUTES } from '@/consts/route';
import { IS_SAAS_BUILD } from '@/consts/route-saas';

export const metadata: Metadata = IS_SAAS_BUILD
  ? { title: '프레시스위치 · 같이 타고, 바뀌면 다시 짠다' }
  : {};

export default async function Home() {
  if (!IS_SAAS_BUILD) redirect(ROUTES.INTAKE);

  const { SaasLanding } = await import('@/components/saas-landing');

  return <SaasLanding />;
}
