import type { ReactNode } from 'react';

import { AuthGuard } from '@/app/(saas)/app/_components/auth-guard';
import { SaasSidebar } from '@/app/(saas)/app/_components/saas-sidebar';
import { SaasTopline } from '@/app/(saas)/app/_components/saas-topline';
import '@/app/m2.css';

export default function SaasAppLayout({ children }: { children: ReactNode }) {
  return (
    <div data-ui="m2" className="m2-page m2-app flex flex-col">
      <AuthGuard>
        <div className="m2-main">
          <SaasTopline />
          <div className="m2-window">
            <SaasSidebar />
            <main className="m2-content">{children}</main>
          </div>
        </div>
      </AuthGuard>
    </div>
  );
}
