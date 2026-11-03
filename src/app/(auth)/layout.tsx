import Link from 'next/link';
import type { ReactNode } from 'react';

import { PageWave } from '@/components/page-wave';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-[1600px] items-center px-8">
        <Link href="/login" className="flex items-center gap-2 text-xl font-black text-navy">
          프레시스위치
          <span className="text-brand">≈</span>
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 items-start justify-center px-8 pt-12">
        {children}
      </main>
      <PageWave />
    </>
  );
}
