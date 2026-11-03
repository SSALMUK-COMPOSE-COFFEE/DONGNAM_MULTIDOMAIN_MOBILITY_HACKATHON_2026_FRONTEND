import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';

import { Providers } from '@/components/providers';

import './globals.css';

// 한글 글리프는 subsets 와 상관없이 unicode-range 로 나뉘어 함께 제공된다 (subsets 는 preload 대상)
const notoSansKr = Noto_Sans_KR({
  variable: '--font-noto-sans-kr',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '프레시스위치 · 공동적재·재최적화 시뮬레이터',
  description: '여러 수출업체의 출하를 하나의 최적 운송계획으로',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
