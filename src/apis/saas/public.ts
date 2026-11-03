'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';

import { saasApi } from '@/apis/saas/client';
import { saasRetry } from '@/apis/saas/retry';
import { SAAS_ENDPOINTS } from '@/consts/api-saas';
import type { ShowcaseT } from '@/types/saas-public';

const SHOWCASE_STALE_MS = 5 * 60 * 1000;

export const publicKeys = {
  all: ['public'] as const,
  showcase: ['public', 'showcase'] as const,
};

export const getShowcase = async () => {
  const { data } = await saasApi.get<ShowcaseT>(SAAS_ENDPOINTS.PUBLIC_SHOWCASE);

  return data;
};

export const showcaseQueryOptions = () =>
  queryOptions({
    queryKey: publicKeys.showcase,
    queryFn: getShowcase,
    retry: saasRetry,
    staleTime: SHOWCASE_STALE_MS,
  });

export const useShowcase = () => useQuery(showcaseQueryOptions());
