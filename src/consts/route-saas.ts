import type { OrgType } from '@/types/saas';

export const SESSION_COOKIE_NAME = 'fs_session';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const IS_SAAS_BUILD = BASE_PATH !== '';

export const SAAS_PAGES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  APP: '/app',
} as const;

export type SaasMenuIconT =
  | 'plans'
  | 'pool'
  | 'coldchain'
  | 'settlement'
  | 'device'
  | 'home'
  | 'lots'
  | 'confirm'
  | 'requests'
  | 'voyages'
  | 'orders';

export type SaasMenuCountKeyT =
  | 'platformPlans'
  | 'platformRegisteredLots'
  | 'shipperRegisteredLots'
  | 'shipperPendingConfirmations'
  | 'shipperPendingRequests'
  | 'forwarderPlans';

export type SaasMenuItemT = {
  href: string;
  label: string;
  icon: SaasMenuIconT;
  section?: string;
  countKey?: SaasMenuCountKeyT;
  countStrong?: boolean;
};

export type SaasRoleRouteT = {
  label: string;
  home: string;
  menu: readonly SaasMenuItemT[];
};

export const ORG_TYPES = ['platform', 'shipper', 'forwarder'] as const satisfies readonly OrgType[];

export const SAAS_ROUTES = {
  platform: {
    label: '플랫폼 운영',
    home: '/app/platform',
    menu: [
      {
        href: '/app/platform/plans',
        label: '공동적재 계획',
        icon: 'plans',
        section: '운영',
        countKey: 'platformPlans',
      },
      {
        href: '/app/platform',
        label: '출하 풀',
        icon: 'pool',
        section: '운영',
        countKey: 'platformRegisteredLots',
      },
      {
        href: '/app/platform/coldchain',
        label: '콜드체인 관제',
        icon: 'coldchain',
        section: '운영',
      },
      { href: '/app/platform/settlements', label: '정산', icon: 'settlement', section: '운영' },
      { href: '/app/platform/devices', label: '온도 기기', icon: 'device', section: '설정' },
    ],
  },
  shipper: {
    label: '화주',
    home: '/app/shipper',
    menu: [
      { href: '/app/shipper', label: '홈', icon: 'home' },
      {
        href: '/app/shipper/lots',
        label: '내 출하',
        icon: 'lots',
        countKey: 'shipperRegisteredLots',
      },
      {
        href: '/app/shipper/plans',
        label: '계획 확정',
        icon: 'confirm',
        countKey: 'shipperPendingConfirmations',
        countStrong: true,
      },
      {
        href: '/app/shipper/requests',
        label: '요청 응답',
        icon: 'requests',
        countKey: 'shipperPendingRequests',
        countStrong: true,
      },
      { href: '/app/shipper/coldchain', label: '내 화물 상태', icon: 'coldchain' },
      { href: '/app/shipper/onboarding', label: '선과장 등록', icon: 'home' },
      { href: '/app/shipper/settlements', label: '정산', icon: 'settlement' },
    ],
  },
  forwarder: {
    label: '포워더',
    home: '/app/forwarder',
    menu: [
      { href: '/app/forwarder', label: '배정 항차', icon: 'voyages', countKey: 'forwarderPlans' },
      { href: '/app/forwarder/orders', label: '실행 지시', icon: 'orders' },
      { href: '/app/forwarder/coldchain', label: '콜드체인', icon: 'coldchain' },
    ],
  },
} as const satisfies Record<OrgType, SaasRoleRouteT>;

export type SandboxStepT = {
  step: string;
  label: string;
  orgType: OrgType;
  href: string;
};

export const SANDBOX_SCENARIO_STEPS = [
  { step: '①', label: '출하 등록', orgType: 'shipper', href: '/app/shipper/lots' },
  { step: '②', label: '계획 생성', orgType: 'platform', href: '/app/platform' },
  { step: '③', label: '화주 확정', orgType: 'shipper', href: '/app/shipper/plans' },
  { step: '④', label: '포워더 확정', orgType: 'forwarder', href: '/app/forwarder' },
] as const satisfies readonly SandboxStepT[];

export const SIGNUP_ORG_TYPES = ['shipper', 'forwarder'] as const satisfies readonly OrgType[];

export const roleHome = (orgType: OrgType) => SAAS_ROUTES[orgType].home;

export const pathnameOf = (path: string) => path.split(/[?#]/)[0];

export const orgTypeOfPath = (path: string): OrgType | null => {
  const pathname = pathnameOf(path);

  return (
    ORG_TYPES.find(orgType => {
      const home = roleHome(orgType);

      return pathname === home || pathname.startsWith(`${home}/`);
    }) ?? null
  );
};

export const isActiveMenu = (pathname: string, href: string, home: string) =>
  href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

export const safeNextPath = (next: string | null, basePath = BASE_PATH) => {
  if (!next) return null;

  const path =
    basePath && (next === basePath || next.startsWith(`${basePath}/`))
      ? next.slice(basePath.length) || '/'
      : next;

  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  const pathname = pathnameOf(path);

  if (pathname !== SAAS_PAGES.APP && !pathname.startsWith(`${SAAS_PAGES.APP}/`)) return null;

  return path;
};
