import type { OrgType } from '@/types/saas';

export const SESSION_COOKIE_NAME = 'fs_session';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

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
  | 'orders'
  | 'companies'
  | 'users';

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
    label: '서비스 관리자',
    home: '/app/platform',
    menu: [
      { href: '/app/platform', label: '서비스 현황', icon: 'home', section: '서비스 관리' },
      {
        href: '/app/platform/companies',
        label: '업체 현황',
        icon: 'companies',
        section: '서비스 관리',
      },
      { href: '/app/platform/users', label: '계정 현황', icon: 'users', section: '서비스 관리' },
      {
        href: '/app/platform/plans',
        label: '운송계획 조회',
        icon: 'plans',
        section: '이용 현황',
        countKey: 'platformPlans',
      },
      {
        href: '/app/platform/resources',
        label: '컨테이너 현황',
        icon: 'voyages',
        section: '이용 현황',
      },
      {
        href: '/app/platform/settlements',
        label: '서비스 정산',
        icon: 'settlement',
        section: '이용 현황',
      },
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
      { href: '/app/shipper/refill-offers', label: '빈자리 제안', icon: 'requests' },
      { href: '/app/shipper/coldchain', label: '내 화물 상태', icon: 'coldchain' },
      { href: '/app/shipper/onboarding', label: '출하 장소 관리', icon: 'home' },
      { href: '/app/shipper/products', label: '품목 관리', icon: 'lots' },
      { href: '/app/shipper/settlements', label: '정산', icon: 'settlement' },
    ],
  },
  forwarder: {
    label: '포워더',
    home: '/app/forwarder',
    menu: [
      { href: '/app/forwarder/containers', label: '컨테이너 관리', icon: 'lots' },
      { href: '/app/forwarder/voyages', label: '항차 설정', icon: 'voyages' },
      { href: '/app/forwarder/lots', label: '출하 풀 · 계획 생성', icon: 'pool' },
      {
        href: '/app/forwarder',
        label: '공동적재 계획',
        icon: 'voyages',
        countKey: 'forwarderPlans',
      },
      { href: '/app/forwarder/orders', label: '실행 지시', icon: 'orders' },
      { href: '/app/forwarder/coldchain', label: '콜드체인', icon: 'coldchain' },
    ],
  },
} as const satisfies Record<OrgType, SaasRoleRouteT>;

export const SIGNUP_ORG_TYPES = ['shipper', 'forwarder'] as const satisfies readonly OrgType[];

export const roleCompanySettings = (orgType: OrgType) =>
  `${SAAS_ROUTES[orgType].home}/company-settings`;

export const roleSettings = (orgType: OrgType) => `${SAAS_ROUTES[orgType].home}/settings`;

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

  const prefix = [basePath, '/test'].find(
    candidate => candidate && (next === candidate || next.startsWith(`${candidate}/`))
  );
  const path = prefix ? next.slice(prefix.length) || '/' : next;

  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  const pathname = pathnameOf(path);

  if (pathname !== SAAS_PAGES.APP && !pathname.startsWith(`${SAAS_PAGES.APP}/`)) return null;

  return path;
};
