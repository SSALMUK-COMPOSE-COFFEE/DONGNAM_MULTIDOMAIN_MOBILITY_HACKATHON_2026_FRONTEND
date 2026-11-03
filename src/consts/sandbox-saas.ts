export const DEMO_EMAIL_DOMAIN = 'demo.freshswitch.ssalhub.xyz';

export const DEMO_DEVICE_PREFIX = 'demo-';

export type DemoOrgOptionT = {
  org_id: string;
  org_name: string;
};

export const DEMO_SHIPPER_ORGS = [
  { org_id: 'shipper-jinju', org_name: '진주 딸기 수출농가 A' },
  { org_id: 'shipper-sancheong', org_name: '산청 딸기 수출농가 B' },
  { org_id: 'shipper-miryang', org_name: '밀양 딸기 수출농가 C' },
  { org_id: 'shipper-sangju', org_name: '상주 포도 수출농가 D' },
  { org_id: 'shipper-pohang', org_name: '포항 포도 수출농가 E' },
] as const satisfies readonly DemoOrgOptionT[];

export const demoShipperPackhouseId = (orgId: string) => `ph-${orgId.replace(/^shipper-/, '')}`;

export const DEMO_PLATFORM_ORG = {
  org_id: 'freshswitch',
  org_name: '프레시스위치',
} as const satisfies DemoOrgOptionT;

export const DEMO_FORWARDER_ORGS = [
  { org_id: 'forwarder-dongnam', org_name: '동남 콜드체인 포워딩' },
  { org_id: 'forwarder-sinhang', org_name: '신항 해운 포워딩' },
] as const satisfies readonly DemoOrgOptionT[];

export const isDemoEmail = (email: string) => {
  const domain = email.trim().toLowerCase().split('@').pop() ?? '';

  return domain === DEMO_EMAIL_DOMAIN || domain.endsWith(`.${DEMO_EMAIL_DOMAIN}`);
};
