'use client';

import { queryOptions, useQuery } from '@tanstack/react-query';

import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { orgKeys } from '@/apis/saas/keys';
import { saasRetry } from '@/apis/saas/retry';
import { SAAS_ENDPOINTS } from '@/consts/api-saas';
import type { SaasSchemaT } from '@/types/api-saas';

export type AdminOverviewT = SaasSchemaT<'AdminOverview'>;
export type AdminCompanyT = SaasSchemaT<'AdminCompany'>;
export type AdminUserT = SaasSchemaT<'AdminUser'>;

export const adminOverviewQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: [...orgKeys.scoped(orgId), 'admin', 'overview'],
    queryFn: async () => {
      const { data } = await saasApi.get<AdminOverviewT>(SAAS_ENDPOINTS.ADMIN_OVERVIEW);

      return data;
    },
    retry: saasRetry,
    staleTime: 30_000,
  });

export const useAdminOverview = () => {
  const { data: me } = useMe();

  return useQuery({
    ...adminOverviewQueryOptions(me?.active_org.org_id ?? ''),
    enabled: me?.active_org.org_type === 'platform',
  });
};
