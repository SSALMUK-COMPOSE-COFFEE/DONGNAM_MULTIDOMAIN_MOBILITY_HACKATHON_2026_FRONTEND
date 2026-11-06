'use client';

import { useEffect } from 'react';

import { usePlanStore } from '@/stores/usePlanStore';

/** 저장된 계획 ID는 마운트 뒤에 읽는다 (서버 렌더링 결과와 어긋나지 않게) */
export function PlanStoreHydrator() {
  useEffect(() => {
    usePlanStore.persist.rehydrate();
  }, []);

  return null;
}
