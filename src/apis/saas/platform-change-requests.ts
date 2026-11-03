'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { analysisKeys } from '@/apis/saas/keys';
import { invalidatePlatformMetrics, platformKeys, usePlatformOrgId } from '@/apis/saas/platform';
import { saasRetry } from '@/apis/saas/retry';
import type {
  ChangeRequestAppliedT,
  ChangeRequestApplyT,
  ChangeRequestRejectT,
  ChangeRequestReplanT,
  PlatformChangeRequestListParamsT,
  PlatformChangeRequestT,
} from '@/types/saas-platform';

export const PLATFORM_CHANGE_REQUEST_ENDPOINTS = {
  CHANGE_REQUESTS: '/saas/platform/change-requests',
  CHANGE_REQUEST: (requestId: string) =>
    `/saas/platform/change-requests/${encodeURIComponent(requestId)}`,
  REPLAN: (requestId: string) =>
    `/saas/platform/change-requests/${encodeURIComponent(requestId)}/replan`,
  APPLY: (requestId: string) =>
    `/saas/platform/change-requests/${encodeURIComponent(requestId)}/apply`,
  REJECT: (requestId: string) =>
    `/saas/platform/change-requests/${encodeURIComponent(requestId)}/reject`,
} as const;

const REPLAN_TIMEOUT_MS = 30_000;

export const platformChangeRequestKeys = {
  all: (orgId: string) => [...platformKeys.all(orgId), 'change-requests'] as const,
  lists: (orgId: string) => [...platformChangeRequestKeys.all(orgId), 'list'] as const,
  list: (orgId: string, params: PlatformChangeRequestListParamsT) =>
    [...platformChangeRequestKeys.lists(orgId), params] as const,
  detail: (orgId: string, requestId: string) =>
    [...platformChangeRequestKeys.all(orgId), 'detail', requestId] as const,
};

export const getPlatformChangeRequests = async (params: PlatformChangeRequestListParamsT = {}) => {
  const { data } = await saasApi.get<PlatformChangeRequestT[]>(
    PLATFORM_CHANGE_REQUEST_ENDPOINTS.CHANGE_REQUESTS,
    { params }
  );

  return data;
};

export const getPlatformChangeRequest = async (requestId: string) => {
  const { data } = await saasApi.get<PlatformChangeRequestT>(
    PLATFORM_CHANGE_REQUEST_ENDPOINTS.CHANGE_REQUEST(requestId)
  );

  return data;
};

export const postChangeRequestReplan = async (requestId: string) => {
  const { data } = await saasApi.post<ChangeRequestReplanT>(
    PLATFORM_CHANGE_REQUEST_ENDPOINTS.REPLAN(requestId),
    null,
    { params: { llm: false }, timeout: REPLAN_TIMEOUT_MS }
  );

  return data;
};

export const postChangeRequestApply = async (requestId: string, request: ChangeRequestApplyT) => {
  const { data } = await saasApi.post<ChangeRequestAppliedT>(
    PLATFORM_CHANGE_REQUEST_ENDPOINTS.APPLY(requestId),
    request
  );

  return data;
};

export const postChangeRequestReject = async (
  requestId: string,
  request: ChangeRequestRejectT = {}
) => {
  const { data } = await saasApi.post<PlatformChangeRequestT>(
    PLATFORM_CHANGE_REQUEST_ENDPOINTS.REJECT(requestId),
    request
  );

  return data;
};

export const platformChangeRequestsQueryOptions = (
  orgId: string,
  params: PlatformChangeRequestListParamsT = {}
) =>
  queryOptions({
    queryKey: platformChangeRequestKeys.list(orgId, params),
    queryFn: () => getPlatformChangeRequests(params),
    retry: saasRetry,
    enabled: !!orgId,
  });

export const platformChangeRequestQueryOptions = (orgId: string, requestId: string) =>
  queryOptions({
    queryKey: platformChangeRequestKeys.detail(orgId, requestId),
    queryFn: () => getPlatformChangeRequest(requestId),
    retry: saasRetry,
    enabled: !!orgId && !!requestId,
  });

export const usePlatformChangeRequests = (params: PlatformChangeRequestListParamsT = {}) =>
  useQuery(platformChangeRequestsQueryOptions(usePlatformOrgId(), params));

export const usePlatformChangeRequest = (requestId: string) =>
  useQuery(platformChangeRequestQueryOptions(usePlatformOrgId(), requestId));

const useStoreChangeRequest = () => {
  const orgId = usePlatformOrgId();
  const queryClient = useQueryClient();

  return (request: PlatformChangeRequestT) => {
    queryClient.setQueryData(platformChangeRequestKeys.detail(orgId, request.request_id), request);
    queryClient.invalidateQueries({ queryKey: platformChangeRequestKeys.lists(orgId) });
  };
};

export const useChangeRequestReplan = () => {
  const storeRequest = useStoreChangeRequest();

  return useMutation({
    mutationFn: postChangeRequestReplan,
    onSuccess: ({ change_request }) => storeRequest(change_request),
    onError: toastSaasError('변경 요청으로 재계산하지 못했습니다.'),
  });
};

export const useApplyChangeRequest = () => {
  const orgId = usePlatformOrgId();
  const queryClient = useQueryClient();
  const storeRequest = useStoreChangeRequest();

  return useMutation({
    mutationFn: ({ requestId, ...request }: ChangeRequestApplyT & { requestId: string }) =>
      postChangeRequestApply(requestId, request),
    onSuccess: ({ change_request: changeRequest }) => {
      const planId = changeRequest.plan_id;
      storeRequest(changeRequest);
      queryClient.invalidateQueries({ queryKey: platformKeys.plan(orgId, planId) });
      queryClient.invalidateQueries({ queryKey: platformKeys.plans(orgId), exact: true });
      queryClient.invalidateQueries({ queryKey: platformKeys.lots(orgId) });
      queryClient.invalidateQueries({ queryKey: platformKeys.settlements(orgId) });
      queryClient.invalidateQueries({ queryKey: analysisKeys.plan(orgId, planId) });
      invalidatePlatformMetrics(queryClient, orgId);
      toast.success('변경 요청을 계획에 반영했습니다. 화주·포워더 확정을 기다립니다.');
    },
    onError: toastSaasError('변경 요청을 반영하지 못했습니다.'),
  });
};

export const useRejectChangeRequest = () => {
  const storeRequest = useStoreChangeRequest();

  return useMutation({
    mutationFn: ({ requestId, ...request }: ChangeRequestRejectT & { requestId: string }) =>
      postChangeRequestReject(requestId, request),
    onSuccess: rejected => {
      storeRequest(rejected);
      toast.success('변경 요청을 반려했습니다. 화주에게 알림을 남겼습니다.');
    },
    onError: toastSaasError('변경 요청을 반려하지 못했습니다.'),
  });
};
