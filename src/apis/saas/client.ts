import axios, { isAxiosError } from 'axios';

import { getActiveOrgId } from '@/apis/saas/active-org';
import { orgKeys } from '@/apis/saas/keys';
import { getSaasQueryClient } from '@/apis/saas/retry';
import {
  BASE_PATH,
  SAAS_API_BASE,
  SAAS_AUTH_ENDPOINTS,
  SAAS_HEADERS,
  SAAS_LOGIN_PATH,
  SAAS_PUBLIC_PATHS,
  SAAS_REQUESTED_WITH,
} from '@/consts/api-saas';
import { mockingReady } from '@/mocks/ready';

export const saasApi = axios.create({
  baseURL: SAAS_API_BASE,
  timeout: 15_000,
  withCredentials: true,
  headers: { [SAAS_HEADERS.REQUESTED_WITH]: SAAS_REQUESTED_WITH },
});

saasApi.interceptors.request.use(async config => {
  await mockingReady;

  const orgId = getActiveOrgId();

  if (orgId && !config.headers.has(SAAS_HEADERS.ORG_ID)) {
    config.headers.set(SAAS_HEADERS.ORG_ID, orgId);
  }

  return config;
});

const stripBasePath = (pathname: string) => {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return '/';
  if (pathname.startsWith(`${BASE_PATH}/`)) return pathname.slice(BASE_PATH.length);

  return pathname;
};

export const loginHref = (next?: string) => {
  const href = `${BASE_PATH}${SAAS_LOGIN_PATH}`;

  return next ? `${href}?next=${encodeURIComponent(next)}` : href;
};

const currentAppPath = () => {
  const { pathname, search } = window.location;

  return `${stripBasePath(pathname)}${search}`;
};

const redirectToLogin = () => {
  getSaasQueryClient()?.removeQueries({ queryKey: orgKeys.all });

  if (typeof window === 'undefined') return;
  if (SAAS_PUBLIC_PATHS.includes(stripBasePath(window.location.pathname))) return;

  window.location.assign(loginHref(currentAppPath()));
};

saasApi.interceptors.response.use(
  response => response,
  error => {
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      !SAAS_AUTH_ENDPOINTS.includes(error.config?.url ?? '')
    ) {
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);
