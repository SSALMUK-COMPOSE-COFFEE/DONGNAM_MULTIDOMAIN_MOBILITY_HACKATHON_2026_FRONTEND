'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { analysisKeys } from '@/apis/saas/keys';
import { platformKeys, usePlatformOrgId } from '@/apis/saas/platform';
import { saasRetry } from '@/apis/saas/retry';
import type { SaasSchemaT } from '@/types/api-saas';

export type PlanConfirmationStateT = SaasSchemaT<'PlanConfirmationState'>;
export type PlanConfirmationT = SaasSchemaT<'PlanConfirmation'>;
export type PlanConfirmationStatusT = PlanConfirmationT['status'];
export type ReplanCandidateT = SaasSchemaT<'ReplanCandidate'>;
export type ReplanCandidateEventT = NonNullable<ReplanCandidateT['events']>[number];
export type RecomputeRequestT = SaasSchemaT<'RecomputeRequest'>;
export type RecomputeResultT = SaasSchemaT<'RecomputeResult'>;

export const AWAITING_SHIPPERS_STATUS = 'pending_shipper_confirmation';

export const PLATFORM_CONFIRM_ENDPOINTS = {
  ATTENTION: '/saas/platform/plan-confirmations',
  STATE: (planId: string) => `/saas/platform/plans/${encodeURIComponent(planId)}/confirmation`,
  AUTO_ACCEPT: (planId: string) =>
    `/saas/platform/plans/${encodeURIComponent(planId)}/confirmation/auto-accept`,
  RECOMPUTE: (planId: string) =>
    `/saas/platform/plans/${encodeURIComponent(planId)}/confirmation/recompute`,
} as const;

const ATTENTION_LIMIT = 500;

export const platformConfirmKeys = {
  attention: platformKeys.planConfirmations,
  state: platformKeys.planConfirmation,
};

export const getPlatformConfirmation = async (planId: string) => {
  const { data } = await saasApi.get<PlanConfirmationStateT>(
    PLATFORM_CONFIRM_ENDPOINTS.STATE(planId)
  );

  return data;
};

export const getPlatformAttention = async () => {
  const { data } = await saasApi.get<PlanConfirmationStateT[]>(
    PLATFORM_CONFIRM_ENDPOINTS.ATTENTION,
    { params: { limit: ATTENTION_LIMIT } }
  );

  return data;
};

export const postPlatformAutoAccept = async (planId: string) => {
  const { data } = await saasApi.post<PlanConfirmationStateT>(
    PLATFORM_CONFIRM_ENDPOINTS.AUTO_ACCEPT(planId)
  );

  return data;
};

export const postPlatformRecompute = async (planId: string, request: RecomputeRequestT) => {
  const { data } = await saasApi.post<RecomputeResultT>(
    PLATFORM_CONFIRM_ENDPOINTS.RECOMPUTE(planId),
    request
  );

  return data;
};

export const platformConfirmationQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: platformConfirmKeys.state(orgId, planId),
    queryFn: () => getPlatformConfirmation(planId),
    retry: saasRetry,
    staleTime: 0,
    enabled: !!orgId && !!planId,
  });

export const platformAttentionQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: platformConfirmKeys.attention(orgId),
    queryFn: getPlatformAttention,
    retry: saasRetry,
    staleTime: 0,
    enabled: !!orgId,
  });

export const usePlatformConfirmation = (planId: string) =>
  useQuery(platformConfirmationQueryOptions(usePlatformOrgId(), planId));

export const usePlatformAttention = () =>
  useQuery(platformAttentionQueryOptions(usePlatformOrgId()));

export const confirmationCounts = (state: PlanConfirmationStateT | null | undefined) => {
  const rows = state?.confirmations ?? [];

  return {
    total: rows.length,
    accepted: rows.filter(({ status }) => status === 'accepted').length,
    rejected: rows.filter(({ status }) => status === 'rejected').length,
    pending: rows.filter(({ status }) => status === 'pending').length,
  };
};

const useInvalidatePlanState = (planId: string) => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();

  return () => {
    queryClient.invalidateQueries({ queryKey: platformKeys.plan(orgId, planId) });
    queryClient.invalidateQueries({ queryKey: platformKeys.plans(orgId), exact: true });
    queryClient.invalidateQueries({ queryKey: platformConfirmKeys.attention(orgId) });
    queryClient.invalidateQueries({ queryKey: platformKeys.settlements(orgId) });
  };
};

export const useAutoAcceptConfirmation = (planId: string) => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();
  const invalidate = useInvalidatePlanState(planId);

  return useMutation({
    mutationFn: () => postPlatformAutoAccept(planId),
    onSuccess: state => {
      queryClient.setQueryData(platformConfirmKeys.state(orgId, planId), state);
      toast.success('남은 화주 확인을 모두 수락 처리했습니다.');
    },
    onError: toastSaasError('자동 수락하지 못했습니다.'),
    onSettled: invalidate,
  });
};

export const useRecomputeWithoutRejected = (planId: string) => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();
  const invalidate = useInvalidatePlanState(planId);

  return useMutation({
    mutationFn: (request: RecomputeRequestT) => postPlatformRecompute(planId, request),
    onSuccess: ({ plan, confirmation }) => {
      queryClient.setQueryData(platformKeys.plan(orgId, planId), plan);
      queryClient.setQueryData(platformConfirmKeys.state(orgId, planId), confirmation);
      queryClient.invalidateQueries({ queryKey: platformKeys.lots(orgId) });
      queryClient.invalidateQueries({ queryKey: platformKeys.planOrders(orgId, planId) });
      queryClient.invalidateQueries({ queryKey: analysisKeys.plan(orgId, planId) });
      toast.success('거절한 화주를 빼고 계획을 다시 짰습니다. 남은 화주의 확인을 기다립니다.');
    },
    onError: toastSaasError('거절한 화주를 빼고 다시 짜지 못했습니다.'),
    onSettled: invalidate,
  });
};
