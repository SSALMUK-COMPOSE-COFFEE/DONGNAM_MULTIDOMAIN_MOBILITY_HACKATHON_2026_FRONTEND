'use client';

import { useEffect } from 'react';

import { worker } from '@/mocks/browser';
import { markMockingReady } from '@/mocks/ready';

/** 개발 모드의 effect 두 번 실행에도 워커는 한 번만 시작한다 (두 번 시작하면 MSW 가 오류를 낸다) */
let workerStart: Promise<unknown> | null = null;

/**
 * msw/browser 는 Node 환경에서 불러올 수 없으므로 (exports 의 node: null)
 * 이 컴포넌트는 반드시 next/dynamic 의 ssr: false 로만 불러온다.
 */
export default function MswWorker() {
  useEffect(() => {
    workerStart ??= worker.start({ onUnhandledFrame: 'bypass', quiet: true });
    workerStart.then(markMockingReady);
  }, []);

  return null;
}
