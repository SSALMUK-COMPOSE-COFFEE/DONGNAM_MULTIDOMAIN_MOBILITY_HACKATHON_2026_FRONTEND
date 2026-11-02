'use client';

import { useEffect } from 'react';

import { worker } from '@/mocks/browser';

/**
 * msw/browser 는 Node 환경에서 불러올 수 없으므로 (exports 의 node: null)
 * 이 컴포넌트는 반드시 next/dynamic 의 ssr: false 로만 불러온다.
 */
export default function MswWorker({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    worker.start({ onUnhandledFrame: 'bypass', quiet: true }).then(onReady);
  }, [onReady]);

  return null;
}
