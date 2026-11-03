'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { saasRetry } from '@/apis/saas/retry';
import { shipperKeys, useShipperOrgId } from '@/apis/saas/shipper';
import type {
  PackhouseCreateT,
  PackhousePatchT,
  PackhouseT,
  ShipperProfilePatchT,
  ShipperProfileT,
  ShipperProfileViewT,
} from '@/types/saas-shipper';

export const SHIPPER_PROFILE_ENDPOINTS = {
  PROFILE: '/saas/shipper/profile',
  PACKHOUSES: '/saas/shipper/packhouses',
  PACKHOUSE: (packhouseId: string) => `/saas/shipper/packhouses/${encodeURIComponent(packhouseId)}`,
} as const;

export const shipperProfileKeys = {
  profile: (orgId: string) => [...shipperKeys.all(orgId), 'profile'] as const,
  packhouses: (orgId: string) => [...shipperKeys.all(orgId), 'packhouses'] as const,
};

export const getShipperProfile = async () => {
  const { data } = await saasApi.get<ShipperProfileViewT>(SHIPPER_PROFILE_ENDPOINTS.PROFILE);

  return data;
};

export const patchShipperProfile = async (patch: ShipperProfilePatchT) => {
  const { data } = await saasApi.patch<ShipperProfileT>(SHIPPER_PROFILE_ENDPOINTS.PROFILE, patch);

  return data;
};

export const getShipperPackhouses = async () => {
  const { data } = await saasApi.get<PackhouseT[]>(SHIPPER_PROFILE_ENDPOINTS.PACKHOUSES);

  return data;
};

export const postShipperPackhouse = async (request: PackhouseCreateT) => {
  const { data } = await saasApi.post<PackhouseT>(SHIPPER_PROFILE_ENDPOINTS.PACKHOUSES, request);

  return data;
};

export const patchShipperPackhouse = async (packhouseId: string, patch: PackhousePatchT) => {
  const { data } = await saasApi.patch<PackhouseT>(
    SHIPPER_PROFILE_ENDPOINTS.PACKHOUSE(packhouseId),
    patch
  );

  return data;
};

export const deleteShipperPackhouse = async (packhouseId: string) => {
  await saasApi.delete(SHIPPER_PROFILE_ENDPOINTS.PACKHOUSE(packhouseId));
};

export const shipperProfileQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: shipperProfileKeys.profile(orgId),
    queryFn: getShipperProfile,
    retry: saasRetry,
    enabled: !!orgId,
  });

export const shipperPackhousesQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: shipperProfileKeys.packhouses(orgId),
    queryFn: getShipperPackhouses,
    retry: saasRetry,
    enabled: !!orgId,
  });

export const useShipperProfile = () => useQuery(shipperProfileQueryOptions(useShipperOrgId()));

export const useShipperPackhouses = () =>
  useQuery(shipperPackhousesQueryOptions(useShipperOrgId()));

const useInvalidateShipperProfile = () => {
  const orgId = useShipperOrgId();
  const queryClient = useQueryClient();

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: shipperProfileKeys.profile(orgId) }),
      queryClient.invalidateQueries({ queryKey: shipperProfileKeys.packhouses(orgId) }),
      queryClient.invalidateQueries({ queryKey: shipperKeys.lots(orgId) }),
      queryClient.invalidateQueries({ queryKey: shipperKeys.catalog(orgId) }),
    ]);
};

export const useUpdateShipperProfile = () => {
  const invalidate = useInvalidateShipperProfile();

  return useMutation({
    mutationFn: patchShipperProfile,
    onSuccess: () => {
      invalidate();
      toast.success('화주 정보를 저장했습니다.');
    },
    onError: toastSaasError('화주 정보를 저장하지 못했습니다.'),
  });
};

export const useCreateShipperPackhouse = () => {
  const invalidate = useInvalidateShipperProfile();

  return useMutation({
    mutationFn: postShipperPackhouse,
    onSuccess: packhouse => {
      invalidate();
      toast.success(`${packhouse.name} 선과장을 등록했습니다.`);
    },
    onError: toastSaasError('선과장을 등록하지 못했습니다.'),
  });
};

export const useUpdateShipperPackhouse = () => {
  const invalidate = useInvalidateShipperProfile();

  return useMutation({
    mutationFn: ({ packhouseId, patch }: { packhouseId: string; patch: PackhousePatchT }) =>
      patchShipperPackhouse(packhouseId, patch),
    onSuccess: () => {
      invalidate();
      toast.success('선과장 정보를 저장했습니다.');
    },
    onError: toastSaasError('선과장 정보를 저장하지 못했습니다.'),
  });
};

export const useDeleteShipperPackhouse = () => {
  const invalidate = useInvalidateShipperProfile();

  return useMutation({
    mutationFn: deleteShipperPackhouse,
    onSuccess: () => {
      invalidate();
      toast.success('선과장을 지웠습니다.');
    },
    onError: toastSaasError('선과장을 지우지 못했습니다.'),
  });
};
