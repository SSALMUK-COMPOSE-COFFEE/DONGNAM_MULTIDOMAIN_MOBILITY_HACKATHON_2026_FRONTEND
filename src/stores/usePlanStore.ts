import { create } from 'zustand';

type PlanStoreT = {
  /** 백엔드가 메모리에 들고 있는 계획 세션 ID. 새로고침하면 다시 생성한다 */
  planId: string | null;
  setPlanId: (planId: string) => void;
};

export const usePlanStore = create<PlanStoreT>(set => ({
  planId: null,
  setPlanId: planId => set({ planId }),
}));
