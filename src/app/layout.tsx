import type { Metadata } from 'next';

import { Providers } from '@/components/providers';

import './fonts/pretendard/pretendardvariable-dynamic-subset.css';
import './globals.css';

export const metadata: Metadata = {
  title: '프레시스위치 · 공동적재 운송 관리',
  description: '여러 수출업체의 출하를 하나의 최적 운송계획으로',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="antialiased">
      <body className="flex min-h-dvh flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
