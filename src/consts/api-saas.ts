export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const SAAS_API_BASE = process.env.NEXT_PUBLIC_SAAS_API_BASE || `${BASE_PATH}/api`;

export const SAAS_LOGIN_PATH = '/login';
export const SAAS_SIGNUP_PATH = '/signup';

export const SAAS_PUBLIC_PATHS: readonly string[] = ['/', SAAS_LOGIN_PATH, SAAS_SIGNUP_PATH];

export const SAAS_HEADERS = {
  REQUESTED_WITH: 'X-Requested-With',
  ORG_ID: 'X-Org-Id',
} as const;

export const SAAS_REQUESTED_WITH = 'freshswitch';

export const SAAS_ENDPOINTS = {
  AUTH_SIGNUP: '/auth/signup',
  AUTH_LOGIN: '/auth/login',
  AUTH_DEMO_LOGIN: '/auth/demo-login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_ACTIVE_ORG: '/auth/active-org',
  ME: '/me',
  COMPANY: '/saas/org',
  ADMIN_OVERVIEW: '/saas/admin/overview',
  PUBLIC_SHOWCASE: '/public/showcase',
} as const;

export const SAAS_AUTH_ENDPOINTS: readonly string[] = [
  SAAS_ENDPOINTS.AUTH_SIGNUP,
  SAAS_ENDPOINTS.AUTH_LOGIN,
  SAAS_ENDPOINTS.AUTH_DEMO_LOGIN,
  SAAS_ENDPOINTS.AUTH_LOGOUT,
  SAAS_ENDPOINTS.PUBLIC_SHOWCASE,
];

export const SAAS_RESOURCE_ENDPOINTS = {
  FORWARDER: '/saas/forwarder/resources',
  RESOURCE: (id: string) => `/saas/forwarder/resources/${encodeURIComponent(id)}`,
  PLATFORM: '/saas/platform/resources',
  OPTIONS: '/saas/resources/options',
} as const;

export const SAAS_ALLOCATION_ENDPOINTS = {
  LOTS: (role: 'platform' | 'forwarder') => `/saas/${role}/lots`,
  PLANS: (role: 'platform' | 'forwarder') => `/saas/${role}/plans`,
  PREVIEW: (role: 'platform' | 'forwarder') => `/saas/${role}/plans/preview`,
  CATALOG: '/saas/catalog',
} as const;
