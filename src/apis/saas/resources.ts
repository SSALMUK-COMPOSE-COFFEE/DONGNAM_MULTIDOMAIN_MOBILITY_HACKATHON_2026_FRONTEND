'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { orgKeys } from '@/apis/saas/keys';
import { saasRetry } from '@/apis/saas/retry';
import { SAAS_RESOURCE_ENDPOINTS } from '@/consts/api-saas';
import type { ResourceInputT, ResourceOptionsT, ResourceT } from '@/types/saas-resources';

type ResourceRoleT = 'platform' | 'forwarder';

export const resourceKeys = {
  all: (orgId: string) => [...orgKeys.scoped(orgId), 'resources'] as const,
  list: (orgId: string, role: ResourceRoleT) => [...resourceKeys.all(orgId), role] as const,
  options: (orgId: string) => [...resourceKeys.all(orgId), 'options'] as const,
};

export const getResources = async (role: ResourceRoleT) => {
  const { data } = await saasApi.get<ResourceT[]>(
    role === 'forwarder' ? SAAS_RESOURCE_ENDPOINTS.FORWARDER : SAAS_RESOURCE_ENDPOINTS.PLATFORM
  );
  return data;
};

export const getResourceOptions = async () => {
  const { data } = await saasApi.get<ResourceOptionsT>(SAAS_RESOURCE_ENDPOINTS.OPTIONS);
  return data;
};

export const resourceListQueryOptions = (orgId: string, role: ResourceRoleT) =>
  queryOptions({
    queryKey: resourceKeys.list(orgId, role),
    queryFn: () => getResources(role),
    enabled: !!orgId,
    retry: saasRetry,
    refetchInterval: 30_000,
  });

export const useResources = (role: ResourceRoleT) => {
  const { data: me } = useMe();
  const orgId = me?.active_org.org_type === role ? me.active_org.org_id : '';
  return useQuery(resourceListQueryOptions(orgId, role));
};

export const useResourceOptions = () => {
  const { data: me } = useMe();
  const orgId = me?.active_org.org_id ?? '';
  return useQuery({
    queryKey: resourceKeys.options(orgId),
    queryFn: getResourceOptions,
    enabled: !!orgId && me?.active_org.org_type !== 'shipper',
    retry: saasRetry,
  });
};

export const useSaveResource = () => {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const orgId = me?.active_org.org_id ?? '';
  return useMutation({
    mutationFn: async ({ id, input }: { id: string | null; input: ResourceInputT }) => {
      const { data } = id
        ? await saasApi.patch<ResourceT>(SAAS_RESOURCE_ENDPOINTS.RESOURCE(id), input)
        : await saasApi.post<ResourceT>(SAAS_RESOURCE_ENDPOINTS.FORWARDER, input);
      return data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.scoped(orgId) });
      toast.success(id ? '컨테이너 제공 정보를 수정했습니다.' : '가용 컨테이너를 등록했습니다.');
    },
    onError: toastSaasError('컨테이너 정보를 저장하지 못했습니다.'),
  });
};

export const useDeleteResource = () => {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const orgId = me?.active_org.org_id ?? '';
  return useMutation({
    mutationFn: async (id: string) => {
      await saasApi.delete(SAAS_RESOURCE_ENDPOINTS.RESOURCE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.scoped(orgId) });
      toast.success('컨테이너 제공 정보를 삭제했습니다.');
    },
    onError: toastSaasError('컨테이너 정보를 삭제하지 못했습니다.'),
  });
};
