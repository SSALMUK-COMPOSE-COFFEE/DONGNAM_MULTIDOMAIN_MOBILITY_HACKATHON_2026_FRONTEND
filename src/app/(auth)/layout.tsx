import type { ReactNode } from 'react';

import { AuthShell } from '@/app/(auth)/_components/auth-shell';
import '@/app/m2.css';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div data-ui="m2" className="fs-auth-root">
      <AuthShell>{children}</AuthShell>
    </div>
  );
}
