import type { OrgType } from '@/types/saas';

export const SESSION_COOKIE_NAME = 'fs_session';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const SAAS_PAGES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  APP: '/app',
} as const;

export type SaasMenuItemT = {
  href: string;
  label: string;
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
      { href: '/app/platform', label: '출하 현황' },
      { href: '/app/platform/plans', label: '공동적재 계획' },
      { href: '/app/platform/coldchain', label: '콜드체인 관제' },
      { href: '/app/platform/settlements', label: '정산' },
    ],
  },
  shipper: {
    label: '화주',
    home: '/app/shipper',
    menu: [
      { href: '/app/shipper', label: '내 출하' },
      { href: '/app/shipper/plans', label: '운송계획 확인' },
      { href: '/app/shipper/settlements', label: '절감액 · 정산' },
    ],
  },
  forwarder: {
    label: '포워더',
    home: '/app/forwarder',
    menu: [
      { href: '/app/forwarder', label: '배정된 항차' },
      { href: '/app/forwarder/orders', label: '실행 지시' },
      { href: '/app/forwarder/coldchain', label: '콜드체인 조회' },
    ],
  },
} as const satisfies Record<OrgType, SaasRoleRouteT>;

export const SIGNUP_ORG_TYPES = ['shipper', 'forwarder'] as const satisfies readonly OrgType[];

export const roleHome = (orgType: OrgType) => SAAS_ROUTES[orgType].home;

const pathnameOf = (path: string) => path.split(/[?#]/)[0];

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
