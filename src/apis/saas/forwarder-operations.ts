'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { forwarderKeys, useForwarderOrgId } from '@/apis/saas/forwarder';
import { analysisKeys } from '@/apis/saas/keys';
import { allocationKeys } from '@/apis/saas/planning';
import type { RecomputeRequestT, RecomputeResultT } from '@/apis/saas/platform-confirm';
import { saasRetry } from '@/apis/saas/retry';
import type { AlternativeIdT, PlanEventT, ReplanResponseT } from '@/types/api';
import type { SaasPlanSessionT } from '@/types/api-saas';
import type {
  AirSeaComparisonT,
  DelayForecastRequestT,
  DelayForecastResponseT,
  ScheduleCheckInputT,
  ScheduleCheckResponseT,
} from '@/types/saas-analysis';
import type {
  ChangeRequestAppliedT,
  ChangeRequestApplyT,
  ChangeRequestRejectT,
  ChangeRequestReplanT,
  PlatformChangeRequestListParamsT,
  PlatformChangeRequestT,
} from '@/types/saas-platform';

const planPath = (planId: string) => `/plans/${encodeURIComponent(planId)}`;
const requestPath = (requestId: string) =>
  `/saas/forwarder/change-requests/${encodeURIComponent(requestId)}`;
const requestKeys = (orgId: string) => [...forwarderKeys.all(orgId), 'change-requests'];
const REPLAN_TIMEOUT_MS = 30_000;

const postReplanEvent = async (planId: string, event: PlanEventT) =>
  (
    await saasApi.post<ReplanResponseT>(
      `${planPath(planId)}/events`,
      { event },
      {
        params: { llm: false },
        timeout: REPLAN_TIMEOUT_MS,
      }
    )
  ).data;

const postAddLot = async (planId: string, lotId: string) =>
  (
    await saasApi.post<ReplanResponseT>(
      `/saas/forwarder/plans/${encodeURIComponent(planId)}/add-lot`,
      { lot_id: lotId },
      { params: { llm: false }, timeout: REPLAN_TIMEOUT_MS }
    )
  ).data;

const useInvalidateOperations = () => {
  const queryClient = useQueryClient();
  const orgId = useForwarderOrgId();
  return (planId: string) => {
    queryClient.invalidateQueries({ queryKey: forwarderKeys.all(orgId) });
    queryClient.invalidateQueries({ queryKey: allocationKeys.all(orgId, 'forwarder') });
    queryClient.invalidateQueries({ queryKey: analysisKeys.plan(orgId, planId) });
  };
};

export const useForwarderReplanFlow = (planId: string) => {
  const queryClient = useQueryClient();
  const orgId = useForwarderOrgId();
  const invalidate = useInvalidateOperations();
  const [external, setExternal] = useState<{ planId: string; result: ReplanResponseT } | null>(
    null
  );
  const externalReplan = external?.planId === planId ? external.result : null;
  const replan = useMutation({
    mutationFn: (event: PlanEventT) => postReplanEvent(planId, event),
    onError: toastSaasError('재최적화하지 못했습니다.'),
  });
  const addLot = useMutation({
    mutationFn: (lotId: string) => postAddLot(planId, lotId),
    onSuccess: result => setExternal({ planId, result }),
    onError: toastSaasError('출하를 넣어 다시 짜지 못했습니다.'),
  });
  const replanResult = externalReplan ?? replan.data ?? null;
  const apply = useMutation({
    mutationFn: async (alternativeId: AlternativeIdT) =>
      (
        await saasApi.post<SaasPlanSessionT>(`${planPath(planId)}/apply`, {
          alternative_id: alternativeId,
          replan_id: replanResult?.replan_id ?? '',
        })
      ).data,
    onSuccess: updated => {
      queryClient.setQueryData(forwarderKeys.plan(orgId, planId), updated);
      invalidate(planId);
      toast.success('대안을 적용했습니다. 화주·포워더 확정을 기다립니다.');
    },
    onError: toastSaasError('대안을 적용하지 못했습니다.'),
  });
  return {
    replanResult,
    isReplanning: replan.isPending || addLot.isPending,
    runReplan: (event: PlanEventT) => {
      apply.reset();
      addLot.reset();
      setExternal(null);
      replan.mutate(event);
    },
    runAddLot: (lotId: string) => {
      apply.reset();
      replan.reset();
      setExternal(null);
      addLot.mutate(lotId);
    },
    loadExternalReplan: (result: ReplanResponseT | null) => {
      apply.reset();
      replan.reset();
      addLot.reset();
      setExternal(result?.plan_id === planId ? { planId, result } : null);
    },
    isExternalReplan: externalReplan !== null,
    appliedId: apply.isSuccess ? apply.variables : null,
    applyingId: apply.isPending ? apply.variables : null,
    applyAlternative: (alternativeId: AlternativeIdT) => apply.mutate(alternativeId),
  };
};

export const useForwarderAirSeaCompare = (planId: string, lotId: string) => {
  const orgId = useForwarderOrgId();
  return useQuery({
    queryKey: analysisKeys.airSea(orgId, planId, lotId),
    queryFn: async () =>
      (
        await saasApi.post<AirSeaComparisonT>('/compare/air-vs-sea', {
          plan_id: planId,
          lot_id: lotId,
        })
      ).data,
    enabled: !!orgId && !!planId && !!lotId,
    retry: saasRetry,
  });
};

export const useForwarderDelayForecast = (planId: string) =>
  useMutation({
    mutationFn: async (request: DelayForecastRequestT = {}) =>
      (
        await saasApi.post<DelayForecastResponseT>(`${planPath(planId)}/delay-forecast`, request, {
          params: { llm: false },
          timeout: REPLAN_TIMEOUT_MS,
        })
      ).data,
    onError: toastSaasError('지연 예측을 계산하지 못했습니다.'),
  });

export const useForwarderScheduleCheck = (planId: string) =>
  useMutation({
    mutationFn: async ({ demo = false, ...request }: ScheduleCheckInputT = {}) =>
      (
        await saasApi.post<ScheduleCheckResponseT>(`${planPath(planId)}/schedule-check`, request, {
          params: { demo },
          timeout: REPLAN_TIMEOUT_MS,
        })
      ).data,
    onError: toastSaasError('선박 일정을 확인하지 못했습니다.'),
  });

export const useForwarderChangeRequests = (params: PlatformChangeRequestListParamsT = {}) => {
  const orgId = useForwarderOrgId();
  return useQuery({
    queryKey: [...requestKeys(orgId), params],
    queryFn: async () =>
      (await saasApi.get<PlatformChangeRequestT[]>('/saas/forwarder/change-requests', { params }))
        .data,
    enabled: !!orgId,
    retry: saasRetry,
  });
};

export const useForwarderChangeRequestReplan = () => {
  const queryClient = useQueryClient();
  const orgId = useForwarderOrgId();
  return useMutation({
    mutationFn: async (requestId: string) =>
      (
        await saasApi.post<ChangeRequestReplanT>(`${requestPath(requestId)}/replan`, null, {
          params: { llm: false },
          timeout: REPLAN_TIMEOUT_MS,
        })
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: requestKeys(orgId) }),
    onError: toastSaasError('변경 요청으로 재계산하지 못했습니다.'),
  });
};

export const useForwarderApplyChangeRequest = () => {
  const invalidate = useInvalidateOperations();
  return useMutation({
    mutationFn: async ({ requestId, ...request }: ChangeRequestApplyT & { requestId: string }) =>
      (await saasApi.post<ChangeRequestAppliedT>(`${requestPath(requestId)}/apply`, request)).data,
    onSuccess: ({ change_request }) => {
      invalidate(change_request.plan_id);
      toast.success('변경 요청을 계획에 반영했습니다. 화주·포워더 확정을 기다립니다.');
    },
    onError: toastSaasError('변경 요청을 반영하지 못했습니다.'),
  });
};

export const useForwarderRejectChangeRequest = () => {
  const queryClient = useQueryClient();
  const orgId = useForwarderOrgId();
  return useMutation({
    mutationFn: async ({ requestId, ...request }: ChangeRequestRejectT & { requestId: string }) =>
      (await saasApi.post<PlatformChangeRequestT>(`${requestPath(requestId)}/reject`, request))
        .data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys(orgId) });
      toast.success('변경 요청을 반려했습니다. 화주에게 알림을 남겼습니다.');
    },
    onError: toastSaasError('변경 요청을 반려하지 못했습니다.'),
  });
};

export const useForwarderRecomputeWithoutRejected = (planId: string) => {
  const queryClient = useQueryClient();
  const orgId = useForwarderOrgId();
  const invalidate = useInvalidateOperations();
  return useMutation({
    mutationFn: async (request: RecomputeRequestT) =>
      (
        await saasApi.post<RecomputeResultT>(
          `/saas/forwarder/plans/${encodeURIComponent(planId)}/confirmation/recompute`,
          request
        )
      ).data,
    onSuccess: ({ plan }) => {
      queryClient.setQueryData(forwarderKeys.plan(orgId, planId), plan);
      invalidate(planId);
      toast.success('거절한 화주를 빼고 다시 짰습니다. 남은 화주의 확인을 기다립니다.');
    },
    onError: toastSaasError('거절한 화주를 빼고 다시 짜지 못했습니다.'),
  });
};
