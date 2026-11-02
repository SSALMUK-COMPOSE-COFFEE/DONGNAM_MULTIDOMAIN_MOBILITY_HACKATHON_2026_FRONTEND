'use client';

import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { planQueryOptions } from '@/apis/getPlan';
import { usePlanStore } from '@/stores/usePlanStore';

/**
 * 저장된 계획 세션을 불러온다.
 * 백엔드는 계획을 메모리에만 두므로 서버 재시작·데모 초기화 뒤에는 404 가 온다.
 * 그때는 저장된 ID를 지워 계획을 다시 만들게 한다.
 */
export const useCurrentPlan = () => {
  const planId = usePlanStore(state => state.planId);
  const hasHydrated = usePlanStore(state => state.hasHydrated);
  const clearPlan = usePlanStore(state => state.clearPlan);

  const query = useQuery({ ...planQueryOptions(planId ?? ''), enabled: !!planId });
  const isExpired = isAxiosError(query.error) && query.error.response?.status === 404;

  useEffect(() => {
    if (!isExpired) return;

    clearPlan();
    toast.info('서버에서 계획이 초기화되어 다시 생성해야 합니다.');
  }, [isExpired, clearPlan]);

  return { planId, hasHydrated, ...query };
};
