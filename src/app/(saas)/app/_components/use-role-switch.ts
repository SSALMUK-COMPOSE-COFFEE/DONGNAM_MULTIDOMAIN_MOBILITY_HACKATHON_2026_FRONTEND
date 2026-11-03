'use client';

import { create } from 'zustand';

import { useDemoLogin, useMe } from '@/apis/saas/auth';
import { rememberedDemoOrg, useDemoOrgStore } from '@/app/(saas)/app/_components/demo-org-store';
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
  const activeOrg = useMe().data?.active_org ?? null;

  const switchRole = (orgType: OrgType, target: string = roleHome(orgType)) => {
    const { setTarget } = useRoleSwitchStore.getState();
    const demoOrgs = useDemoOrgStore.getState();

    if (activeOrg) demoOrgs.remember(activeOrg.org_type, activeOrg.org_id);
    const orgId = rememberedDemoOrg(orgType);

    setTarget(null);
    demoLogin.mutate(orgId ? { org_type: orgType, org_id: orgId } : orgType, {
      onSuccess: () => setTarget(target),
      onError: () => {
        if (orgId) demoOrgs.forget(orgType);
      },
    });
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
