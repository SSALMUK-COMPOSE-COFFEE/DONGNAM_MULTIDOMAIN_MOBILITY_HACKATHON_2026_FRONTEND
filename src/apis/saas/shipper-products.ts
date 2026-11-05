'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { saasApi } from '@/apis/saas/client';
import { saasRetry } from '@/apis/saas/retry';
import { shipperKeys, useShipperOrgId } from '@/apis/saas/shipper';
import type { SaasSchemaT } from '@/types/api-saas';

export type ShipperProductT = SaasSchemaT<'ProductOut'>;
export type ShipperProductInputT = SaasSchemaT<'ProductCreate'>;
const ENDPOINT = '/saas/shipper/products';
export const shipperProductsKey = (orgId: string) => [...shipperKeys.all(orgId), 'products'];
export const useShipperProducts = (includeArchived = false) => {
  const orgId = useShipperOrgId();
  return useQuery({
    queryKey: includeArchived
      ? [...shipperProductsKey(orgId), 'including-archived']
      : shipperProductsKey(orgId),
    queryFn: async () =>
      (
        await saasApi.get<ShipperProductT[]>(ENDPOINT, {
          params: includeArchived ? { include_archived: true } : {},
        })
      ).data,
    enabled: !!orgId,
    retry: saasRetry,
  });
};
export const useSaveShipperProduct = () => {
  const orgId = useShipperOrgId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ShipperProductInputT }) =>
      id
        ? (await saasApi.patch<ShipperProductT>(`${ENDPOINT}/${encodeURIComponent(id)}`, input))
            .data
        : (await saasApi.post<ShipperProductT>(ENDPOINT, input)).data,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: shipperProductsKey(orgId) }),
        queryClient.invalidateQueries({ queryKey: shipperKeys.catalog(orgId) }),
      ]),
  });
};

const useInvalidateProducts = () => {
  const orgId = useShipperOrgId();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: shipperProductsKey(orgId) }),
      queryClient.invalidateQueries({ queryKey: shipperKeys.catalog(orgId) }),
    ]);
};

export const useArchiveShipperProduct = () => {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: async (id: string) =>
      (await saasApi.delete<ShipperProductT>(`${ENDPOINT}/${encodeURIComponent(id)}`)).data,
    onSuccess: invalidate,
  });
};

export const useRestoreShipperProduct = () => {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: async (id: string) =>
      (await saasApi.post<ShipperProductT>(`${ENDPOINT}/${encodeURIComponent(id)}/restore`)).data,
    onSuccess: invalidate,
  });
};
