import axios, { isAxiosError } from 'axios';

import { getActiveOrgId } from '@/apis/saas/active-org';
import { orgKeys } from '@/apis/saas/keys';
import { getSaasQueryClient } from '@/apis/saas/retry';
import {
  BASE_PATH,
  SAAS_API_BASE,
  SAAS_AUTH_ENDPOINTS,
  SAAS_ENDPOINTS,
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

const forgetPublicSession = () => {
  const queryClient = getSaasQueryClient();
  if (!queryClient) return;

  queryClient.setQueryData(orgKeys.me, null);
  queryClient.removeQueries({
    queryKey: orgKeys.all,
    predicate: query => query.queryKey[1] !== 'me',
  });
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  if (SAAS_PUBLIC_PATHS.includes(stripBasePath(window.location.pathname))) {
    forgetPublicSession();
    return;
  }

  getSaasQueryClient()?.removeQueries({ queryKey: orgKeys.all });
  window.location.assign(loginHref(currentAppPath()));
};

const recheckSession = () => {
  getSaasQueryClient()?.invalidateQueries({ queryKey: orgKeys.me, exact: true });
};

const isPinnedOrgDenied = (error: unknown) => {
  if (!isAxiosError(error) || error.response?.status !== 403) return false;

  const url = error.config?.url ?? '';

  return (
    !!error.config?.headers?.has(SAAS_HEADERS.ORG_ID) &&
    url !== SAAS_ENDPOINTS.ME &&
    !SAAS_AUTH_ENDPOINTS.includes(url)
  );
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

    if (isPinnedOrgDenied(error)) recheckSession();

    return Promise.reject(error);
  }
);
