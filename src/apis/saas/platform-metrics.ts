'use client';

import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';

import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { platformKeys } from '@/apis/saas/platform';
import { saasRetry } from '@/apis/saas/retry';
import type {
  BusinessYearsParamsT,
  BusinessYearsT,
  PlatformBusinessParamsT,
  PlatformBusinessT,
  PlatformMetricsParamsT,
  PlatformMetricsT,
} from '@/types/saas-platform';

export const PLATFORM_METRICS_ENDPOINTS = {
  METRICS: '/saas/platform/metrics',
  BUSINESS: '/saas/platform/business',
  BUSINESS_YEARS: '/saas/platform/business/years',
} as const;

const METRICS_STALE_MS = 60 * 1000;
const REPEATED_PARAMS = { indexes: null };

export const platformMetricsKeys = {
  all: platformKeys.metrics,
  metrics: (orgId: string, params: PlatformMetricsParamsT) =>
    [...platformMetricsKeys.all(orgId), 'kpi', params] as const,
  business: (orgId: string, params: PlatformBusinessParamsT) =>
    [...platformMetricsKeys.all(orgId), 'business', params] as const,
  years: (orgId: string, params: BusinessYearsParamsT) =>
    [...platformMetricsKeys.all(orgId), 'business-years', params] as const,
};

export const getPlatformMetrics = async (params: PlatformMetricsParamsT = {}) => {
  const { data } = await saasApi.get<PlatformMetricsT>(PLATFORM_METRICS_ENDPOINTS.METRICS, {
    params,
  });

  return data;
};

export const getPlatformBusiness = async (params: PlatformBusinessParamsT = {}) => {
  const { data } = await saasApi.get<PlatformBusinessT>(PLATFORM_METRICS_ENDPOINTS.BUSINESS, {
    params,
  });

  return data;
};

export const getBusinessYears = async (params: BusinessYearsParamsT = {}) => {
  const { data } = await saasApi.get<BusinessYearsT>(PLATFORM_METRICS_ENDPOINTS.BUSINESS_YEARS, {
    params,
    paramsSerializer: REPEATED_PARAMS,
  });

  return data;
};

export const platformMetricsQueryOptions = (orgId: string, params: PlatformMetricsParamsT = {}) =>
  queryOptions({
    queryKey: platformMetricsKeys.metrics(orgId, params),
    queryFn: () => getPlatformMetrics(params),
    retry: saasRetry,
    staleTime: METRICS_STALE_MS,
    placeholderData: keepPreviousData,
    enabled: !!orgId,
  });

export const platformBusinessQueryOptions = (orgId: string, params: PlatformBusinessParamsT = {}) =>
  queryOptions({
    queryKey: platformMetricsKeys.business(orgId, params),
    queryFn: () => getPlatformBusiness(params),
    retry: saasRetry,
    staleTime: METRICS_STALE_MS,
    placeholderData: keepPreviousData,
    enabled: !!orgId,
  });

export const businessYearsQueryOptions = (orgId: string, params: BusinessYearsParamsT = {}) =>
  queryOptions({
    queryKey: platformMetricsKeys.years(orgId, params),
    queryFn: () => getBusinessYears(params),
    retry: saasRetry,
    staleTime: METRICS_STALE_MS,
    placeholderData: keepPreviousData,
    enabled: !!orgId,
  });

const usePlatformRoleOrgId = () => {
  const activeOrg = useMe().data?.active_org;

  return activeOrg?.org_type === 'platform' ? activeOrg.org_id : '';
};

export const usePlatformMetrics = (params: PlatformMetricsParamsT = {}) =>
  useQuery(platformMetricsQueryOptions(usePlatformRoleOrgId(), params));

export const usePlatformBusiness = (params: PlatformBusinessParamsT = {}) =>
  useQuery(platformBusinessQueryOptions(usePlatformRoleOrgId(), params));

export const useBusinessYears = (params: BusinessYearsParamsT = {}) =>
  useQuery(businessYearsQueryOptions(usePlatformRoleOrgId(), params));
