'use client';

import { create } from 'zustand';

import { useDemoLogin } from '@/apis/saas/auth';
import { roleHome } from '@/consts/route-saas';
import type { OrgType } from '@/types/saas';

type RoleSwitchStoreT = {
  target: string | null;
  setTarget: (target: string | null) => void;
};

export const useRoleSwitchStore = create<RoleSwitchStoreT>()(set => ({
  target: null,
  setTarget: target => set({ target }),
}));

export const useRoleSwitch = () => {
  const demoLogin = useDemoLogin();

  const switchRole = (orgType: OrgType, target: string = roleHome(orgType)) => {
    const { setTarget } = useRoleSwitchStore.getState();

    setTarget(null);
    demoLogin.mutate(orgType, { onSuccess: () => setTarget(target) });
  };

  const pending = demoLogin.isPending ? demoLogin.variables : null;
  const pendingType = typeof pending === 'string' ? pending : (pending?.org_type ?? null);

  return {
    switchRole,
    isPending: demoLogin.isPending,
    pendingType,
    error: demoLogin.error,
    isError: demoLogin.isError,
  };
};
