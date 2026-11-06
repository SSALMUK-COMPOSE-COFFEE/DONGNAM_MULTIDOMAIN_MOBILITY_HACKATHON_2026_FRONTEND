import type { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { orgKeys } from '@/apis/saas/keys';

const NO_RETRY_STATUSES = new Set([401, 403, 404]);
const MAX_RETRIES = 1;

export const isNoRetryError = (error: unknown) =>
  isAxiosError(error) && NO_RETRY_STATUSES.has(error.response?.status ?? 0);

export const saasRetry = (failureCount: number, error: unknown) =>
  !isNoRetryError(error) && failureCount < MAX_RETRIES;

let boundQueryClient: QueryClient | null = null;

export const getSaasQueryClient = () => boundQueryClient;

export const configureSaasQueryClient = (queryClient: QueryClient) => {
  queryClient.setQueryDefaults(orgKeys.all, { retry: saasRetry });

  return queryClient;
};

export const bindSaasQueryClient = (queryClient: QueryClient) => {
  if (typeof window === 'undefined') return () => {};

  boundQueryClient = queryClient;

  return () => {
    if (boundQueryClient === queryClient) boundQueryClient = null;
  };
};
