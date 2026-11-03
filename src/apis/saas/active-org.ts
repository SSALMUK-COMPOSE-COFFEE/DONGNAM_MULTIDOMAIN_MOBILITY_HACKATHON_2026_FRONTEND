import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ActiveOrgStoreT = {
  orgId: string | null;
  setOrgId: (orgId: string) => void;
  clearOrgId: () => void;
};

export const ACTIVE_ORG_STORAGE_KEY = 'fs.saas.org';

export const useActiveOrgStore = create<ActiveOrgStoreT>()(
  persist(
    set => ({
      orgId: null,
      setOrgId: orgId => set({ orgId }),
      clearOrgId: () => set({ orgId: null }),
    }),
    {
      name: ACTIVE_ORG_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ orgId }) => ({ orgId }),
    }
  )
);

export const getActiveOrgId = () => useActiveOrgStore.getState().orgId;
