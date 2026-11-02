'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useState } from 'react';

import { IS_API_MOCKING } from '@/consts/api';

const MswWorker = dynamic(() => import('@/components/providers/msw-worker'), { ssr: false });

/**
 * NEXT_PUBLIC_API_MOCKING=enabled 일 때 MSW 워커가 준비된 뒤에 화면을 그린다.
 * 워커보다 요청이 먼저 나가면 목업 대신 실제 서버로 요청이 가기 때문이다.
 */
export function MswProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(!IS_API_MOCKING);
  const handleReady = useCallback(() => setIsReady(true), []);

  return (
    <>
      {IS_API_MOCKING && <MswWorker onReady={handleReady} />}
      {isReady && children}
    </>
  );
}
