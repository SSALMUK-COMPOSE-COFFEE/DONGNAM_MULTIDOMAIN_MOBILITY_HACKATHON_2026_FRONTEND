import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEMO_FORWARDER_ORGS, DEMO_SHIPPER_ORGS } from '@/consts/sandbox-saas';
import type { OrgType } from '@/types/saas';

export type DemoOrgRoleT = Extract<OrgType, 'shipper' | 'forwarder'>;

type DemoOrgStoreT = Record<DemoOrgRoleT, string | null> & {
  remember: (orgType: OrgType, orgId: string) => void;
  forget: (orgType: OrgType) => void;
};

export const DEMO_ORG_STORAGE_KEY = 'fs.saas.demo-orgs';

const DEMO_ORG_IDS: Record<DemoOrgRoleT, readonly string[]> = {
  shipper: DEMO_SHIPPER_ORGS.map(({ org_id }) => org_id),
  forwarder: DEMO_FORWARDER_ORGS.map(({ org_id }) => org_id),
};

export const isDemoOrgRole = (orgType: OrgType): orgType is DemoOrgRoleT =>
  orgType === 'shipper' || orgType === 'forwarder';

export const isKnownDemoOrg = (orgType: OrgType, orgId: string) =>
  isDemoOrgRole(orgType) && DEMO_ORG_IDS[orgType].includes(orgId);

export const useDemoOrgStore = create<DemoOrgStoreT>()(
  persist(
    set => ({
      shipper: null,
      forwarder: null,
      remember: (orgType, orgId) => {
        if (isDemoOrgRole(orgType) && isKnownDemoOrg(orgType, orgId)) set({ [orgType]: orgId });
      },
      forget: orgType => {
        if (isDemoOrgRole(orgType)) set({ [orgType]: null });
      },
    }),
    {
      name: DEMO_ORG_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ shipper, forwarder }) => ({ shipper, forwarder }),
    }
  )
);

export const rememberedDemoOrg = (orgType: OrgType) => {
  if (!isDemoOrgRole(orgType)) return null;

  const orgId = useDemoOrgStore.getState()[orgType];

  return orgId && isKnownDemoOrg(orgType, orgId) ? orgId : null;
};
