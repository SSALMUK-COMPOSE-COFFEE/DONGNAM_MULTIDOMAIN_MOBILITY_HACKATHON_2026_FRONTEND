import type { Me, Membership, OrgType } from '@/types/saas';

export type MockOrgT = {
  org_id: string;
  org_type: OrgType;
  org_name: string;
  shipper_ids: string[];
};

export const DEMO_EMAIL_DOMAIN = 'demo.freshswitch.ssalhub.xyz';
export const DEMO_PASSWORD = 'freshswitch-demo';

export const PLATFORM_ORG_ID = 'freshswitch';
export const DEFAULT_FORWARDER_ORG_ID = 'forwarder-dongnam';

export const MOCK_ORGS: MockOrgT[] = [
  { org_id: PLATFORM_ORG_ID, org_type: 'platform', org_name: '프레시스위치', shipper_ids: [] },
  {
    org_id: 'shipper-jinju',
    org_type: 'shipper',
    org_name: '진주 딸기 수출농가 A',
    shipper_ids: ['sh-jinju'],
  },
  {
    org_id: 'shipper-sancheong',
    org_type: 'shipper',
    org_name: '산청 딸기 수출농가 B',
    shipper_ids: ['sh-sancheong'],
  },
  {
    org_id: 'shipper-miryang',
    org_type: 'shipper',
    org_name: '밀양 딸기 수출농가 C',
    shipper_ids: ['sh-miryang'],
  },
  {
    org_id: 'shipper-sangju',
    org_type: 'shipper',
    org_name: '상주 포도 수출농가 D',
    shipper_ids: ['sh-sangju'],
  },
  {
    org_id: 'shipper-pohang',
    org_type: 'shipper',
    org_name: '포항 포도 수출농가 E',
    shipper_ids: ['sh-pohang'],
  },
  {
    org_id: DEFAULT_FORWARDER_ORG_ID,
    org_type: 'forwarder',
    org_name: '동남 포워딩',
    shipper_ids: [],
  },
  {
    org_id: 'forwarder-sinhang',
    org_type: 'forwarder',
    org_name: '신항 로지스틱스',
    shipper_ids: [],
  },
];

export const findOrg = (orgId: string | null | undefined) =>
  MOCK_ORGS.find(org => org.org_id === orgId) ?? null;

export const orgOfShipper = (shipperId: string) =>
  MOCK_ORGS.find(org => org.shipper_ids.includes(shipperId)) ?? null;

export const demoEmail = (orgId: string) => `${orgId}@${DEMO_EMAIL_DOMAIN}`;

export const firstOrgOfType = (orgType: OrgType) =>
  MOCK_ORGS.find(org => org.org_type === orgType) ?? null;

const membershipOf = (org: MockOrgT): Membership => ({
  org_id: org.org_id,
  org_type: org.org_type,
  org_name: org.org_name,
  role: 'admin',
});

export const meOf = (org: MockOrgT, email = demoEmail(org.org_id), name = org.org_name): Me => {
  const membership = membershipOf(org);

  return {
    user: { id: `user-${org.org_id}`, email, name },
    memberships: [membership],
    active_org: membership,
  };
};
