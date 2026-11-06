import type { Metadata } from 'next';

import { PlanStoreHydrator } from '@/app/(demo)/_components/plan-store-hydrator';
import { DemoNav } from '@/components/demo-nav';
import { PageWave } from '@/components/page-wave';

export const metadata: Metadata = {
  title: '프레시스위치 · 공동적재·재최적화 시뮬레이터',
};

/** 해커톤 시연 화면(/intake ~ /sensor). SaaS 화면과 같은 앱 안에서 주소만 나뉜다 */
export default function DemoLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <DemoNav />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-8 pt-8">{children}</main>
      <PageWave />
      <PlanStoreHydrator />
    </>
  );
}
