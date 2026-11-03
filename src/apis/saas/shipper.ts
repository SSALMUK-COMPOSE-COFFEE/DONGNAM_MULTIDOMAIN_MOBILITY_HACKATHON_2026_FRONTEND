'use client';

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { orgKeys } from '@/apis/saas/keys';
import { SHIPPER_PLANS_POLLING_MS, capOf, openOrdersRefetchInterval } from '@/apis/saas/polling';
import { saasRetry } from '@/apis/saas/retry';
import type { SaasSchemaT, WithDefaultsT } from '@/types/api-saas';
import type {
  ShipperCatalogT,
  ShipperLotCreateT,
  ShipperLotListParamsT,
  ShipperLotPatchT,
  ShipperLotPreviewT,
  ShipperLotT,
  ShipperOrderDecisionT,
  ShipperOrderT,
  ShipperPlanItemT,
  ShipperPlanSessionT,
  ShipperRequestAnswerT,
  ShipperSettlementT,
} from '@/types/saas-shipper';

export const SHIPPER_ENDPOINTS = {
  CATALOG: '/saas/catalog',
  LOTS: '/saas/shipper/lots',
  LOT: (lotId: string) => `/saas/shipper/lots/${encodeURIComponent(lotId)}`,
  PLANS: '/saas/shipper/plans',
  PLAN: (planId: string) => `/saas/shipper/plans/${encodeURIComponent(planId)}`,
  PLAN_ORDERS: (planId: string) => `/saas/shipper/plans/${encodeURIComponent(planId)}/orders`,
  ORDER_CONFIRM: (planId: string, orderId: string) =>
    `/saas/shipper/plans/${encodeURIComponent(planId)}/orders/${encodeURIComponent(orderId)}/confirm`,
  REQUEST_ANSWER: (planId: string, orderId: string, requestId: string) =>
    `/saas/shipper/plans/${encodeURIComponent(planId)}/orders/${encodeURIComponent(orderId)}/requests/${encodeURIComponent(requestId)}`,
  SETTLEMENTS: '/saas/shipper/settlements',
} as const;

export const shipperKeys = {
  all: (orgId: string) => [...orgKeys.scoped(orgId), 'shipper'] as const,
  catalog: (orgId: string) => [...shipperKeys.all(orgId), 'catalog'] as const,
  lots: (orgId: string) => [...shipperKeys.all(orgId), 'lots'] as const,
  lotList: (orgId: string, params: ShipperLotListParamsT) =>
    [...shipperKeys.lots(orgId), params] as const,
  plans: (orgId: string) => [...shipperKeys.all(orgId), 'plans'] as const,
  plan: (orgId: string, planId: string) => [...shipperKeys.plans(orgId), planId] as const,
  orders: (orgId: string, planId: string) =>
    [...shipperKeys.plan(orgId, planId), 'orders'] as const,
  settlements: (orgId: string) => [...shipperKeys.all(orgId), 'settlements'] as const,
};

export const getShipperCatalog = async () => {
  const { data } = await saasApi.get<ShipperCatalogT>(SHIPPER_ENDPOINTS.CATALOG);

  return data;
};

export const SHIPPER_LOTS_LIMIT = 1_000;

const shipperLotsLimit = (params: ShipperLotListParamsT) => params.limit ?? SHIPPER_LOTS_LIMIT;

export const getShipperLots = async (params: ShipperLotListParamsT = {}) => {
  const { data } = await saasApi.get<ShipperLotT[]>(SHIPPER_ENDPOINTS.LOTS, {
    params: { ...params, limit: shipperLotsLimit(params) },
  });

  return data;
};

export const postShipperLot = async (request: ShipperLotCreateT) => {
  const { data } = await saasApi.post<ShipperLotPreviewT>(SHIPPER_ENDPOINTS.LOTS, request);

  return data;
};

export const patchShipperLot = async (lotId: string, patch: ShipperLotPatchT) => {
  const { data } = await saasApi.patch<ShipperLotT>(SHIPPER_ENDPOINTS.LOT(lotId), patch);

  return data;
};

export const deleteShipperLot = async (lotId: string) => {
  await saasApi.delete(SHIPPER_ENDPOINTS.LOT(lotId));
};

export const getShipperPlans = async () => {
  const { data } = await saasApi.get<ShipperPlanItemT[]>(SHIPPER_ENDPOINTS.PLANS);

  return data;
};

export const getShipperPlan = async (planId: string) => {
  const { data } = await saasApi.get<ShipperPlanSessionT>(SHIPPER_ENDPOINTS.PLAN(planId));

  return data;
};

export const getShipperPlanOrders = async (planId: string) => {
  const { data } = await saasApi.get<ShipperOrderT[]>(SHIPPER_ENDPOINTS.PLAN_ORDERS(planId));

  return data;
};

export const postShipperOrderConfirm = async (
  planId: string,
  orderId: string,
  decision: ShipperOrderDecisionT
) => {
  const { data } = await saasApi.post<ShipperOrderT>(
    SHIPPER_ENDPOINTS.ORDER_CONFIRM(planId, orderId),
    decision
  );

  return data;
};

export const postShipperRequestAnswer = async (
  planId: string,
  orderId: string,
  requestId: string,
  answer: ShipperRequestAnswerT
) => {
  const { data } = await saasApi.post<ShipperOrderT>(
    SHIPPER_ENDPOINTS.REQUEST_ANSWER(planId, orderId, requestId),
    answer
  );

  return data;
};

export const getShipperSettlements = async () => {
  const { data } = await saasApi.get<ShipperSettlementT[]>(SHIPPER_ENDPOINTS.SETTLEMENTS);

  return data;
};

export const shipperCatalogQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: shipperKeys.catalog(orgId),
    queryFn: getShipperCatalog,
    retry: saasRetry,
    staleTime: 5 * 60 * 1000,
    enabled: !!orgId,
  });

export const shipperLotsQueryOptions = (orgId: string, params: ShipperLotListParamsT = {}) =>
  queryOptions({
    queryKey: shipperKeys.lotList(orgId, params),
    queryFn: () => getShipperLots(params),
    retry: saasRetry,
    enabled: !!orgId,
  });

export const shipperPlansQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: shipperKeys.plans(orgId),
    queryFn: getShipperPlans,
    retry: saasRetry,
    refetchInterval: SHIPPER_PLANS_POLLING_MS,
    enabled: !!orgId,
  });

export const shipperPlanQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: shipperKeys.plan(orgId, planId),
    queryFn: () => getShipperPlan(planId),
    retry: saasRetry,
    enabled: !!orgId && !!planId,
  });

export const shipperPlanOrdersQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: shipperKeys.orders(orgId, planId),
    queryFn: () => getShipperPlanOrders(planId),
    retry: saasRetry,
    staleTime: 0,
    refetchInterval: openOrdersRefetchInterval,
    enabled: !!orgId && !!planId,
  });

export const shipperSettlementsQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: shipperKeys.settlements(orgId),
    queryFn: getShipperSettlements,
    retry: saasRetry,
    enabled: !!orgId,
  });

export const useShipperOrgId = () => useMe().data?.active_org.org_id ?? '';

export const useShipperCatalog = () => useQuery(shipperCatalogQueryOptions(useShipperOrgId()));

export const useShipperLots = (params: ShipperLotListParamsT = {}) => {
  const query = useQuery(shipperLotsQueryOptions(useShipperOrgId(), params));

  return { ...query, ...capOf(query.data ?? null, shipperLotsLimit(params)) };
};

export const useShipperPlans = () => useQuery(shipperPlansQueryOptions(useShipperOrgId()));

export const useShipperPlan = (planId: string) =>
  useQuery(shipperPlanQueryOptions(useShipperOrgId(), planId));

export const useShipperPlanOrders = (planId: string) =>
  useQuery(shipperPlanOrdersQueryOptions(useShipperOrgId(), planId));

export const useShipperOrdersByPlans = (planIds: readonly string[]) => {
  const orgId = useShipperOrgId();

  return useQueries({
    queries: planIds.map(planId => shipperPlanOrdersQueryOptions(orgId, planId)),
  });
};

export const useShipperSettlements = () =>
  useQuery(shipperSettlementsQueryOptions(useShipperOrgId()));

export const useCreateShipperLot = () => {
  const orgId = useShipperOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postShipperLot,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shipperKeys.lots(orgId) }),
  });
};

export const useUpdateShipperLot = () => {
  const orgId = useShipperOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lotId, patch }: { lotId: string; patch: ShipperLotPatchT }) =>
      patchShipperLot(lotId, patch),
    onSettled: () => queryClient.invalidateQueries({ queryKey: shipperKeys.lots(orgId) }),
  });
};

export const useDeleteShipperLot = () => {
  const orgId = useShipperOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteShipperLot,
    onSettled: () => queryClient.invalidateQueries({ queryKey: shipperKeys.lots(orgId) }),
  });
};

export const useInvalidateShipperPlan = () => {
  const orgId = useShipperOrgId();
  const queryClient = useQueryClient();

  return (planId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: shipperKeys.plan(orgId, planId) }),
      queryClient.invalidateQueries({ queryKey: shipperKeys.plans(orgId), exact: true }),
      queryClient.invalidateQueries({ queryKey: shipperKeys.settlements(orgId) }),
    ]);
};

export const useAnswerShipperRequest = () => {
  const invalidatePlan = useInvalidateShipperPlan();

  return useMutation({
    mutationFn: ({
      planId,
      orderId,
      requestId,
      answer,
    }: {
      planId: string;
      orderId: string;
      requestId: string;
      answer: ShipperRequestAnswerT;
    }) => postShipperRequestAnswer(planId, orderId, requestId, answer),
    onSettled: (_data, _error, { planId }) => invalidatePlan(planId),
  });
};

export const SHIPPER_INTAKE_PREVIEW_ENDPOINT = '/intake/lots';

export type ShipperIntakePreviewRequestT = WithDefaultsT<
  SaasSchemaT<'IntakeRequest'>,
  'sell_window' | 'scenario_id' | 'save'
>;

export const shipperIntakePreviewKey = (orgId: string, request: ShipperIntakePreviewRequestT) =>
  [...shipperKeys.all(orgId), 'intake-preview', request] as const;

export const postShipperIntakePreview = async (request: ShipperIntakePreviewRequestT) => {
  const { data } = await saasApi.post<ShipperLotPreviewT>(SHIPPER_INTAKE_PREVIEW_ENDPOINT, {
    ...request,
    save: false,
  });

  return data;
};

export const shipperIntakePreviewQueryOptions = (
  orgId: string,
  request: ShipperIntakePreviewRequestT | null
) =>
  queryOptions({
    queryKey: request
      ? shipperIntakePreviewKey(orgId, request)
      : ([...shipperKeys.all(orgId), 'intake-preview', null] as const),
    queryFn: () =>
      request ? postShipperIntakePreview(request) : Promise.reject(new Error('no request')),
    retry: false,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: !!orgId && !!request,
  });

export const useShipperIntakePreview = (request: ShipperIntakePreviewRequestT | null) =>
  useQuery(shipperIntakePreviewQueryOptions(useShipperOrgId(), request));
