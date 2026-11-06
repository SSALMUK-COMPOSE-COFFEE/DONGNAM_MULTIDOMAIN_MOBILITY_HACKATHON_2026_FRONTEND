'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { saasRetry } from '@/apis/saas/retry';
import { shipperKeys, useShipperOrgId } from '@/apis/saas/shipper';
import type {
  ChangeRequestCreateT,
  ShipperChangeRequestListParamsT,
  ShipperChangeRequestT,
  ShipperNotificationListParamsT,
  ShipperNotificationT,
} from '@/types/saas-shipper';

export const SHIPPER_CHANGE_REQUEST_ENDPOINTS = {
  PLAN_CHANGE_REQUESTS: (planId: string) =>
    `/saas/shipper/plans/${encodeURIComponent(planId)}/change-requests`,
  CHANGE_REQUESTS: '/saas/shipper/change-requests',
  NOTIFICATIONS: '/saas/shipper/notifications',
} as const;

const CHANGE_REQUEST_TIMEOUT_MS = 30_000;
const NOTIFICATIONS_POLLING_MS = 30_000;

export const shipperChangeRequestKeys = {
  all: (orgId: string) => [...shipperKeys.all(orgId), 'change-requests'] as const,
  list: (orgId: string, params: ShipperChangeRequestListParamsT) =>
    [...shipperChangeRequestKeys.all(orgId), params] as const,
  notifications: (orgId: string) => [...shipperKeys.all(orgId), 'notifications'] as const,
  notificationList: (orgId: string, params: ShipperNotificationListParamsT) =>
    [...shipperChangeRequestKeys.notifications(orgId), params] as const,
};

export const postShipperChangeRequest = async (planId: string, request: ChangeRequestCreateT) => {
  const { data } = await saasApi.post<ShipperChangeRequestT>(
    SHIPPER_CHANGE_REQUEST_ENDPOINTS.PLAN_CHANGE_REQUESTS(planId),
    request,
    { timeout: CHANGE_REQUEST_TIMEOUT_MS }
  );

  return data;
};

export const getShipperChangeRequests = async (params: ShipperChangeRequestListParamsT = {}) => {
  const { data } = await saasApi.get<ShipperChangeRequestT[]>(
    SHIPPER_CHANGE_REQUEST_ENDPOINTS.CHANGE_REQUESTS,
    { params }
  );

  return data;
};

export const getShipperNotifications = async (params: ShipperNotificationListParamsT = {}) => {
  const { data } = await saasApi.get<ShipperNotificationT[]>(
    SHIPPER_CHANGE_REQUEST_ENDPOINTS.NOTIFICATIONS,
    { params }
  );

  return data;
};

export const shipperChangeRequestsQueryOptions = (
  orgId: string,
  params: ShipperChangeRequestListParamsT = {}
) =>
  queryOptions({
    queryKey: shipperChangeRequestKeys.list(orgId, params),
    queryFn: () => getShipperChangeRequests(params),
    retry: saasRetry,
    enabled: !!orgId,
  });

export const shipperNotificationsQueryOptions = (
  orgId: string,
  params: ShipperNotificationListParamsT = {}
) =>
  queryOptions({
    queryKey: shipperChangeRequestKeys.notificationList(orgId, params),
    queryFn: () => getShipperNotifications(params),
    retry: saasRetry,
    refetchInterval: query => (query.state.status === 'error' ? false : NOTIFICATIONS_POLLING_MS),
    enabled: !!orgId,
  });

export const useShipperChangeRequests = (params: ShipperChangeRequestListParamsT = {}) =>
  useQuery(shipperChangeRequestsQueryOptions(useShipperOrgId(), params));

export const useShipperNotifications = (params: ShipperNotificationListParamsT = {}) =>
  useQuery(shipperNotificationsQueryOptions(useShipperOrgId(), params));

export const useCreateShipperChangeRequest = (planId: string) => {
  const orgId = useShipperOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ChangeRequestCreateT) => postShipperChangeRequest(planId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shipperChangeRequestKeys.all(orgId) });
      queryClient.invalidateQueries({ queryKey: shipperKeys.plan(orgId, planId) });
      toast.success('변경 요청을 보냈습니다. 플랫폼이 재계산한 뒤 알려 드립니다.');
    },
    onError: toastSaasError('변경 요청을 보내지 못했습니다.'),
  });
};
