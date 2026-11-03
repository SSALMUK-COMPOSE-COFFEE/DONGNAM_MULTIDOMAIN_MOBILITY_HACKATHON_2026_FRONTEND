'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { saasRetry } from '@/apis/saas/retry';
import { shipperKeys, useShipperOrgId } from '@/apis/saas/shipper';
import type { SaasSchemaT } from '@/types/api-saas';

export type ShipperConfirmationViewT = SaasSchemaT<'ShipperConfirmationView'>;
export type ShipperPlanConfirmationT = SaasSchemaT<'PlanConfirmation'>;
export type ShipperConfirmationStatusT = ShipperPlanConfirmationT['status'];
export type ShipperConfirmationDecisionT = SaasSchemaT<'ConfirmationDecision'>;

export const SHIPPER_CONFIRM_ENDPOINTS = {
  LIST: '/saas/shipper/plan-confirmations',
  PLAN: (planId: string) => `/saas/shipper/plans/${encodeURIComponent(planId)}/confirmation`,
} as const;

export const shipperConfirmKeys = {
  lists: (orgId: string) => [...shipperKeys.all(orgId), 'plan-confirmations'] as const,
  list: (orgId: string, status: ShipperConfirmationStatusT | null) =>
    [...shipperConfirmKeys.lists(orgId), status ?? 'all'] as const,
  plan: (orgId: string, planId: string) =>
    [...shipperKeys.plan(orgId, planId), 'confirmation'] as const,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isReplanPending = (value: unknown) => isRecord(value) && value.replan_pending === true;

export const getShipperPlanConfirmations = async (status: ShipperConfirmationStatusT | null) => {
  const { data } = await saasApi.get<ShipperPlanConfirmationT[]>(SHIPPER_CONFIRM_ENDPOINTS.LIST, {
    params: status ? { status } : {},
  });

  return data;
};

export const getShipperPlanConfirmation = async (planId: string) => {
  const { data } = await saasApi.get<ShipperConfirmationViewT>(
    SHIPPER_CONFIRM_ENDPOINTS.PLAN(planId)
  );

  return data;
};

export const postShipperPlanConfirmation = async (
  planId: string,
  decision: ShipperConfirmationDecisionT
) => {
  const { data } = await saasApi.post<ShipperConfirmationViewT>(
    SHIPPER_CONFIRM_ENDPOINTS.PLAN(planId),
    decision
  );

  return data;
};

export const shipperPlanConfirmationsQueryOptions = (
  orgId: string,
  status: ShipperConfirmationStatusT | null
) =>
  queryOptions({
    queryKey: shipperConfirmKeys.list(orgId, status),
    queryFn: () => getShipperPlanConfirmations(status),
    retry: saasRetry,
    staleTime: 0,
    enabled: !!orgId,
  });

export const shipperPlanConfirmationQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: shipperConfirmKeys.plan(orgId, planId),
    queryFn: () => getShipperPlanConfirmation(planId),
    retry: saasRetry,
    staleTime: 0,
    enabled: !!orgId && !!planId,
  });

export const useShipperPlanConfirmations = (status: ShipperConfirmationStatusT | null = null) =>
  useQuery(shipperPlanConfirmationsQueryOptions(useShipperOrgId(), status));

export const useShipperPlanConfirmation = (planId: string) =>
  useQuery(shipperPlanConfirmationQueryOptions(useShipperOrgId(), planId));

type PlanDecisionT = {
  accept: boolean;
  reason: string | null;
  shipperIds: readonly string[];
};

const decisionMessage = (accept: boolean, planStatus: string | null) => {
  if (!accept) return '계획을 거절했습니다. 플랫폼이 사유를 보고 다시 짭니다.';
  if (planStatus === 'committed') return '계획을 수락했습니다. 모든 화주가 수락해 확정되었습니다.';

  return '계획을 수락했습니다. 다른 화주의 수락을 기다립니다.';
};

export const useDecidePlanConfirmation = (planId: string) => {
  const orgId = useShipperOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accept, reason, shipperIds }: PlanDecisionT) => {
      let view: ShipperConfirmationViewT | null = null;
      for (const shipperId of shipperIds) {
        view = await postShipperPlanConfirmation(planId, {
          accept,
          reason,
          shipper_id: shipperId,
        });
      }

      return view;
    },
    onSuccess: (view, { accept }) => {
      if (view) queryClient.setQueryData(shipperConfirmKeys.plan(orgId, planId), view);
      toast.success(decisionMessage(accept, view?.plan_status ?? null));
    },
    onError: (error, { accept }) =>
      toastSaasError(accept ? '계획을 수락하지 못했습니다.' : '거절을 보내지 못했습니다.')(error),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: shipperKeys.plan(orgId, planId) });
      queryClient.invalidateQueries({ queryKey: shipperKeys.plans(orgId), exact: true });
      queryClient.invalidateQueries({ queryKey: shipperConfirmKeys.lists(orgId) });
      queryClient.invalidateQueries({ queryKey: shipperKeys.lots(orgId) });
      queryClient.invalidateQueries({ queryKey: shipperKeys.settlements(orgId) });
    },
  });
};
