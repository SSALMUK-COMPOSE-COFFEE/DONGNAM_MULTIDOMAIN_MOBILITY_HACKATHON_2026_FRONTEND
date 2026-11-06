import { DEMO_EMAIL_DOMAIN } from '@/consts/sandbox-saas';
import type { Me, Membership, OrgType } from '@/types/saas';

export type MockOrgT = {
  org_id: string;
  org_type: OrgType;
  org_name: string;
  shipper_ids: string[];
  sandbox: boolean;
};

export const PLATFORM_ORG_ID = 'freshswitch';
export const DEFAULT_FORWARDER_ORG_ID = 'forwarder-dongnam';

export const MOCK_ORGS: MockOrgT[] = [
  {
    org_id: PLATFORM_ORG_ID,
    org_type: 'platform',
    org_name: '프레시스위치',
    shipper_ids: [],
    sandbox: true,
  },
  {
    org_id: 'shipper-jinju',
    org_type: 'shipper',
    org_name: '진주 딸기 수출농가 A',
    shipper_ids: ['sh-jinju'],
    sandbox: true,
  },
  {
    org_id: 'shipper-sancheong',
    org_type: 'shipper',
    org_name: '산청 딸기 수출농가 B',
    shipper_ids: ['sh-sancheong'],
    sandbox: true,
  },
  {
    org_id: 'shipper-miryang',
    org_type: 'shipper',
    org_name: '밀양 딸기 수출농가 C',
    shipper_ids: ['sh-miryang'],
    sandbox: true,
  },
  {
    org_id: 'shipper-sangju',
    org_type: 'shipper',
    org_name: '상주 포도 수출농가 D',
    shipper_ids: ['sh-sangju'],
    sandbox: true,
  },
  {
    org_id: 'shipper-pohang',
    org_type: 'shipper',
    org_name: '포항 포도 수출농가 E',
    shipper_ids: ['sh-pohang'],
    sandbox: true,
  },
  {
    org_id: DEFAULT_FORWARDER_ORG_ID,
    org_type: 'forwarder',
    org_name: '동남 콜드체인 포워딩',
    shipper_ids: [],
    sandbox: true,
  },
  {
    org_id: 'forwarder-sinhang',
    org_type: 'forwarder',
    org_name: '신항 해운 포워딩',
    shipper_ids: [],
    sandbox: true,
  },
];

export const findOrg = (orgId: string | null | undefined) =>
  MOCK_ORGS.find(org => org.org_id === orgId) ?? null;

export const orgOfShipper = (shipperId: string) =>
  MOCK_ORGS.find(org => org.shipper_ids.includes(shipperId)) ?? null;

export const demoEmail = (orgId: string) => `${orgId}@${DEMO_EMAIL_DOMAIN}`;

export const firstOrgOfType = (orgType: OrgType) =>
  MOCK_ORGS.find(org => org.org_type === orgType) ?? null;

export const MOCK_WORLD_ID = 'wmock00000001';
export const MOCK_WORLD_EXPIRES_AT = '2099-01-01T00:00:00.000Z';

const membershipOf = (org: MockOrgT, worldId: string | null): Membership => ({
  org_id: org.org_id,
  org_type: org.org_type,
  org_name: org.org_name,
  role: 'admin',
  sandbox: org.sandbox,
  world_id: worldId,
});

export const meOf = (org: MockOrgT, email = demoEmail(org.org_id), name = org.org_name): Me => {
  const membership = membershipOf(org, null);

  return {
    user: { id: `user-${org.org_id}`, email, name },
    memberships: [membership],
    active_org: membership,
    world: null,
  };
};

export const demoWorldMe = (active: MockOrgT): Me => {
  const memberships = MOCK_ORGS.filter(org => org.sandbox).map(org =>
    membershipOf(org, MOCK_WORLD_ID)
  );
  const activeMembership =
    memberships.find(item => item.org_id === active.org_id) ?? membershipOf(active, MOCK_WORLD_ID);

  return {
    user: {
      id: `user-${MOCK_WORLD_ID}`,
      email: `${MOCK_WORLD_ID}@${DEMO_EMAIL_DOMAIN}`,
      name: '데모',
    },
    memberships: memberships.some(item => item.org_id === activeMembership.org_id)
      ? memberships
      : [activeMembership, ...memberships],
    active_org: activeMembership,
    world: { world_id: MOCK_WORLD_ID, expires_at: MOCK_WORLD_EXPIRES_AT },
  };
};
