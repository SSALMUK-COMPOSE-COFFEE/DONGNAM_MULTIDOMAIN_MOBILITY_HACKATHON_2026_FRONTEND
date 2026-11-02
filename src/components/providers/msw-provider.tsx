'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { IS_API_MOCKING } from '@/consts/api';

const MswWorker = dynamic(() => import('@/components/providers/msw-worker'), { ssr: false });

/**
 * NEXT_PUBLIC_API_MOCKING=enabled 일 때 MSW 워커를 띄운다.
 * 화면은 바로 그리고, 요청은 mockingReady 가 풀린 뒤에 나간다 (mocks/ready.ts)
 */
export function MswProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {IS_API_MOCKING && <MswWorker />}
      {children}
    </>
  );
}
