'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { orgKeys } from '@/apis/saas/keys';
import { saasRetry } from '@/apis/saas/retry';
import { SAAS_ALLOCATION_ENDPOINTS } from '@/consts/api-saas';
import type { ScenarioT } from '@/types/api';
import type { SaasPlanSessionT } from '@/types/api-saas';
import type {
  LotStatusT,
  PlanPreviewT,
  PlatformLotT,
  PlatformPlanItemT,
  PlatformPlanRequestT,
} from '@/types/saas-platform';

export type PlanningRoleT = 'platform' | 'forwarder';
export const ALLOCATION_LOTS_LIMIT = 1_000;
export const allocationKeys = {
  all: (orgId: string, role: PlanningRoleT) =>
    [...orgKeys.scoped(orgId), role, 'allocation'] as const,
  lots: (orgId: string, role: PlanningRoleT) =>
    [...allocationKeys.all(orgId, role), 'lots'] as const,
};
export const useAllocationOrgId = () => useMe().data?.active_org.org_id ?? '';

export function useAllocationLots(role: PlanningRoleT, status: LotStatusT | null = null) {
  const orgId = useAllocationOrgId();
  return useQuery({
    queryKey: [...allocationKeys.lots(orgId, role), status],
    queryFn: async () => {
      const { data } = await saasApi.get<PlatformLotT[]>(SAAS_ALLOCATION_ENDPOINTS.LOTS(role), {
        params: { ...(status ? { status } : {}), limit: ALLOCATION_LOTS_LIMIT },
      });
      return data;
    },
    enabled: !!orgId,
    retry: saasRetry,
  });
}

export function useAllocationCatalog(role: PlanningRoleT, resourcesKey = '') {
  const orgId = useAllocationOrgId();
  return useQuery({
    queryKey: [...allocationKeys.all(orgId, role), 'catalog', resourcesKey],
    queryFn: async () => {
      const { data } = await saasApi.get<ScenarioT>(SAAS_ALLOCATION_ENDPOINTS.CATALOG);
      return data;
    },
    enabled: !!orgId,
    retry: saasRetry,
  });
}

export function useAllocationPlans(role: PlanningRoleT) {
  const orgId = useAllocationOrgId();
  return useQuery({
    queryKey: [...allocationKeys.all(orgId, role), 'plans'],
    queryFn: async () => {
      const { data } = await saasApi.get<PlatformPlanItemT[]>(
        SAAS_ALLOCATION_ENDPOINTS.PLANS(role),
        { params: { limit: 500 } }
      );
      return data;
    },
    enabled: !!orgId,
    retry: saasRetry,
  });
}

export function useAllocationPreview(
  role: PlanningRoleT,
  lotIds: readonly string[],
  enabled: boolean,
  resourcesKey = ''
) {
  const orgId = useAllocationOrgId();
  const ids = [...new Set(lotIds)].sort();
  return useQuery({
    queryKey: [...allocationKeys.all(orgId, role), 'preview', resourcesKey, ...ids],
    queryFn: async () => {
      const { data } = await saasApi.post<PlanPreviewT>(
        SAAS_ALLOCATION_ENDPOINTS.PREVIEW(role),
        { lot_ids: ids },
        { timeout: 30_000 }
      );
      return data;
    },
    enabled: !!orgId && ids.length > 0 && enabled,
    placeholderData: keepPreviousData,
    retry: saasRetry,
  });
}

export function useCreateAllocationPlan(role: PlanningRoleT) {
  const orgId = useAllocationOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: PlatformPlanRequestT) => {
      const { data } = await saasApi.post<SaasPlanSessionT>(
        SAAS_ALLOCATION_ENDPOINTS.PLANS(role),
        request
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.scoped(orgId) });
    },
  });
}
