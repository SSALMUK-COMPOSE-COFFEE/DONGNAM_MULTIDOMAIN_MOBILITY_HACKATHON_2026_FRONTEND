import { PlanStoreHydrator } from '@/app/(demo)/_components/plan-store-hydrator';
import { DemoNav } from '@/components/demo-nav';
import { PageWave } from '@/components/page-wave';

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
