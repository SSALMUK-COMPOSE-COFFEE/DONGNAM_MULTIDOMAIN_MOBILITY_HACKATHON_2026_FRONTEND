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

export const isDemoEmail = (email: string) => {
  const domain = email.trim().toLowerCase().split('@').pop() ?? '';

  return domain === DEMO_EMAIL_DOMAIN || domain.endsWith(`.${DEMO_EMAIL_DOMAIN}`);
};
