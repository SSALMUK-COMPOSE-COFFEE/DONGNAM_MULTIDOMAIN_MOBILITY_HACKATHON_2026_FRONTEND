import type { ReactNode } from 'react';

import { AuthGuard } from '@/app/(saas)/app/_components/auth-guard';
import { SaasSidebar } from '@/app/(saas)/app/_components/saas-sidebar';
import { PageWave } from '@/components/page-wave';

export default function SaasAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex flex-1">
        <SaasSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-8 pt-8">{children}</main>
          <PageWave />
        </div>
      </div>
    </AuthGuard>
  );
}
