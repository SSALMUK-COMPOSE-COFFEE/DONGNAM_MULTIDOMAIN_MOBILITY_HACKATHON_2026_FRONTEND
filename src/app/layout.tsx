import type { Metadata } from 'next';
import { Gothic_A1, Hahmlet, IBM_Plex_Mono } from 'next/font/google';

import { DemoNav } from '@/components/demo-nav';
import { Providers } from '@/components/providers';

import './globals.css';

// 한글 글리프는 subsets 와 상관없이 unicode-range 로 나뉘어 함께 제공된다 (subsets 는 preload 대상)
const gothicA1 = Gothic_A1({
  variable: '--font-gothic-a1',
  weight: ['400', '500', '700', '800'],
  subsets: ['latin'],
});

const hahmlet = Hahmlet({
  variable: '--font-hahmlet',
  weight: ['600', '700', '800'],
  subsets: ['latin'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  weight: ['500', '600'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '프레시스위치 · 공동적재·재최적화 시뮬레이터',
  description: '여러 수출업체의 출하를 하나의 최적 운송계획으로',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="ko"
      className={`${gothicA1.variable} ${hahmlet.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <DemoNav />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-8 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
