'use client';

import { useEffect } from 'react';

import { usePlanStore } from '@/stores/usePlanStore';

export function PlanStoreHydrator() {
  useEffect(() => {
    usePlanStore.persist.rehydrate();
  }, []);

  return null;
}
