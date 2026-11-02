import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type PlanStoreT = {
  /**
   * 백엔드가 메모리에 들고 있는 계획 세션 ID.
   * 새로고침해도 이어서 보도록 localStorage 에 저장한다.
   */
  planId: string | null;
  /** localStorage 에서 planId 를 다 읽었는지. 읽기 전에는 '계획 없음'으로 오인하지 않게 한다 */
  hasHydrated: boolean;
  setPlanId: (planId: string) => void;
  clearPlan: () => void;
};

export const usePlanStore = create<PlanStoreT>()(
  persist(
    set => ({
      planId: null,
      hasHydrated: false,
      setPlanId: planId => set({ planId }),
      clearPlan: () => set({ planId: null }),
    }),
    {
      name: 'freshswitch-plan',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ planId }) => ({ planId }),
      // 서버 렌더링 결과(planId 없음)와 어긋나지 않도록 마운트 뒤에 직접 읽는다 (Providers)
      skipHydration: true,
      onRehydrateStorage: () => () => usePlanStore.setState({ hasHydrated: true }),
    }
  )
);
