'use client';

import {
  queryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { orgKeys } from '@/apis/saas/keys';
import { saasRetry } from '@/apis/saas/retry';
import { SAAS_API_BASE } from '@/consts/api-saas';
import type { UseConfirmOrderOptionsT } from '@/hooks/useConfirmOrder';
import { mockingReady } from '@/mocks/ready';
import type {
  ForwarderAlertT,
  ForwarderDecisionT,
  ForwarderOrderT,
  ForwarderPlanItemT,
  ForwarderPlanListParamsT,
  ForwarderPlanSessionT,
  ForwarderRequestAnswerT,
  ForwarderStreamStateT,
  ForwarderTwinStateT,
  ForwarderTwinSummaryT,
} from '@/types/saas-forwarder';

const segment = encodeURIComponent;

export const FORWARDER_ENDPOINTS = {
  PLANS: '/saas/forwarder/plans',
  PLAN: (planId: string) => `/saas/forwarder/plans/${segment(planId)}`,
  PLAN_ORDERS: (planId: string) => `/saas/forwarder/plans/${segment(planId)}/orders`,
  ORDER_CONFIRM: (planId: string, orderId: string) =>
    `/saas/forwarder/plans/${segment(planId)}/orders/${segment(orderId)}/confirm`,
  ORDER_REQUEST: (planId: string, orderId: string, requestId: string) =>
    `/saas/forwarder/plans/${segment(planId)}/orders/${segment(orderId)}/requests/${segment(requestId)}`,
  COLDCHAIN_CONTAINERS: '/coldchain/containers',
  COLDCHAIN_CONTAINER: (containerId: string) => `/coldchain/containers/${segment(containerId)}`,
  COLDCHAIN_ALERTS_STREAM: '/coldchain/alerts/stream',
} as const;

export const forwarderKeys = {
  all: (orgId: string) => [...orgKeys.scoped(orgId), 'forwarder'] as const,
  plans: (orgId: string) => [...forwarderKeys.all(orgId), 'plans'] as const,
  planList: (orgId: string, params: ForwarderPlanListParamsT) =>
    [...forwarderKeys.plans(orgId), 'list', params] as const,
  plan: (orgId: string, planId: string) => [...forwarderKeys.plans(orgId), planId] as const,
  orders: (orgId: string, planId: string) =>
    [...forwarderKeys.plan(orgId, planId), 'orders'] as const,
  coldchain: (orgId: string, planId: string) =>
    [...forwarderKeys.plan(orgId, planId), 'coldchain'] as const,
  containers: (orgId: string, planId: string) =>
    [...forwarderKeys.coldchain(orgId, planId), 'containers'] as const,
  container: (orgId: string, planId: string, containerId: string) =>
    [...forwarderKeys.containers(orgId, planId), containerId] as const,
};

export const getForwarderPlans = async (params: ForwarderPlanListParamsT = {}) => {
  const { data } = await saasApi.get<ForwarderPlanItemT[]>(FORWARDER_ENDPOINTS.PLANS, { params });

  return data;
};

export const getForwarderPlan = async (planId: string) => {
  const { data } = await saasApi.get<ForwarderPlanSessionT>(FORWARDER_ENDPOINTS.PLAN(planId));

  return data;
};

export const getForwarderPlanOrders = async (planId: string) => {
  const { data } = await saasApi.get<ForwarderOrderT[]>(FORWARDER_ENDPOINTS.PLAN_ORDERS(planId));

  return data;
};

export const postForwarderOrderConfirm = async (
  planId: string,
  orderId: string,
  decision: ForwarderDecisionT
) => {
  const { data } = await saasApi.post<ForwarderOrderT>(
    FORWARDER_ENDPOINTS.ORDER_CONFIRM(planId, orderId),
    decision
  );

  return data;
};

export const postForwarderRequestAnswer = async (
  planId: string,
  orderId: string,
  requestId: string,
  answer: ForwarderRequestAnswerT
) => {
  const { data } = await saasApi.post<ForwarderOrderT>(
    FORWARDER_ENDPOINTS.ORDER_REQUEST(planId, orderId, requestId),
    answer
  );

  return data;
};

export const getForwarderContainers = async (planId: string) => {
  const { data } = await saasApi.get<ForwarderTwinSummaryT[]>(
    FORWARDER_ENDPOINTS.COLDCHAIN_CONTAINERS,
    { params: { plan_id: planId } }
  );

  return data;
};

export const getForwarderContainer = async (planId: string, containerId: string) => {
  try {
    const { data } = await saasApi.get<ForwarderTwinStateT>(
      FORWARDER_ENDPOINTS.COLDCHAIN_CONTAINER(containerId),
      { params: { plan_id: planId } }
    );

    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

export const forwarderPlansQueryOptions = (orgId: string, params: ForwarderPlanListParamsT = {}) =>
  queryOptions({
    queryKey: forwarderKeys.planList(orgId, params),
    queryFn: () => getForwarderPlans(params),
    retry: saasRetry,
    enabled: !!orgId,
  });

export const forwarderPlanQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: forwarderKeys.plan(orgId, planId),
    queryFn: () => getForwarderPlan(planId),
    retry: saasRetry,
    enabled: !!orgId && !!planId,
  });

export const forwarderPlanOrdersQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: forwarderKeys.orders(orgId, planId),
    queryFn: () => getForwarderPlanOrders(planId),
    retry: saasRetry,
    staleTime: 0,
    enabled: !!orgId && !!planId,
  });

export const forwarderContainersQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: forwarderKeys.containers(orgId, planId),
    queryFn: () => getForwarderContainers(planId),
    retry: saasRetry,
    staleTime: 0,
    refetchInterval: 10_000,
    enabled: !!orgId && !!planId,
  });

export const forwarderContainerQueryOptions = (
  orgId: string,
  planId: string,
  containerId: string
) =>
  queryOptions({
    queryKey: forwarderKeys.container(orgId, planId, containerId),
    queryFn: () => getForwarderContainer(planId, containerId),
    retry: saasRetry,
    staleTime: 0,
    refetchInterval: 5_000,
    enabled: !!orgId && !!planId && !!containerId,
  });

export const useForwarderOrgId = () => useMe().data?.active_org.org_id ?? '';

export const useForwarderPlans = (params: ForwarderPlanListParamsT = {}) =>
  useQuery(forwarderPlansQueryOptions(useForwarderOrgId(), params));

export const useForwarderPlan = (planId: string) =>
  useQuery(forwarderPlanQueryOptions(useForwarderOrgId(), planId));

export const useForwarderPlanOrders = (planId: string) =>
  useQuery(forwarderPlanOrdersQueryOptions(useForwarderOrgId(), planId));

export const useForwarderOrdersByPlans = (planIds: readonly string[]) => {
  const orgId = useForwarderOrgId();

  return useQueries({
    queries: planIds.map(planId => forwarderPlanOrdersQueryOptions(orgId, planId)),
  });
};

export const useForwarderContainers = (planId: string) =>
  useQuery(forwarderContainersQueryOptions(useForwarderOrgId(), planId));

export const useForwarderContainer = (planId: string, containerId: string) =>
  useQuery(forwarderContainerQueryOptions(useForwarderOrgId(), planId, containerId));

export const useForwarderConfirmOptions = (
  planId: string,
  orderId: string
): UseConfirmOrderOptionsT => {
  const orgId = useForwarderOrgId();
  const queryClient = useQueryClient();

  return useMemo(
    () => ({
      confirmFn: ({ accept, note }) =>
        postForwarderOrderConfirm(planId, orderId, { accept, note: note ?? null }),
      onSuccess: (_updated, { accept }) => {
        if (orgId) queryClient.invalidateQueries({ queryKey: orgKeys.scoped(orgId) });
        if (accept) toast.success('실행 지시를 확정했습니다. 자동 조치를 시작합니다.');
        else toast.success('실행 지시를 거절했습니다.');
      },
      onError: toastSaasError('실행 지시를 처리하지 못했습니다.'),
    }),
    [planId, orderId, orgId, queryClient]
  );
};

export const useAnswerForwarderRequest = (planId: string, orderId: string) => {
  const orgId = useForwarderOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, answer }: { requestId: string; answer: ForwarderRequestAnswerT }) =>
      postForwarderRequestAnswer(planId, orderId, requestId, answer),
    onSuccess: (_updated, { answer }) =>
      toast.success(answer.accepted ? '회신 수락을 기록했습니다.' : '회신 거절을 기록했습니다.'),
    onError: toastSaasError('요청 회신을 기록하지 못했습니다.'),
    onSettled: () => {
      if (orgId) queryClient.invalidateQueries({ queryKey: forwarderKeys.all(orgId) });
    },
  });
};

const STREAM_RETRY_MS = 3_000;
const STREAM_MAX_RETRY_MS = 30_000;

type AlertStreamT = {
  planId: string;
  orgId: string;
  alerts: ForwarderAlertT[];
  state: ForwarderStreamStateT;
};

const toAlertKey = ({ container_id, key }: ForwarderAlertT) => `${container_id}:${key}`;

const streamUrl = (planId: string, since: number) => {
  const params = new URLSearchParams({ plan_id: planId, since: String(since) });

  return `${SAAS_API_BASE}${FORWARDER_ENDPOINTS.COLDCHAIN_ALERTS_STREAM}?${params}`;
};

export const useForwarderAlertStream = (planId: string) => {
  const orgId = useForwarderOrgId();
  const [stream, setStream] = useState<AlertStreamT>({
    planId,
    orgId,
    alerts: [],
    state: 'connecting',
  });

  useEffect(() => {
    if (!planId || !orgId) return;

    const seen = new Set<number>();
    let lastSeq = 0;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = STREAM_RETRY_MS;
    let isClosed = false;

    const update = (next: Partial<Omit<AlertStreamT, 'planId' | 'orgId'>>) =>
      setStream(prev =>
        prev.planId === planId && prev.orgId === orgId
          ? { ...prev, ...next }
          : { planId, orgId, alerts: [], state: 'connecting', ...next }
      );

    const connect = () => {
      if (isClosed) return;

      source = new EventSource(streamUrl(planId, lastSeq), { withCredentials: true });
      source.addEventListener('open', () => {
        retryDelay = STREAM_RETRY_MS;
        update({ state: 'open' });
      });
      source.addEventListener('alert', event => {
        const alert = JSON.parse((event as MessageEvent<string>).data) as ForwarderAlertT;
        lastSeq = Math.max(lastSeq, alert.seq);
        if (seen.has(alert.seq)) return;

        seen.add(alert.seq);
        const alertKey = toAlertKey(alert);
        setStream(prev =>
          prev.planId === planId && prev.orgId === orgId
            ? {
                ...prev,
                alerts: [alert, ...prev.alerts.filter(item => toAlertKey(item) !== alertKey)],
              }
            : { planId, orgId, alerts: [alert], state: 'open' }
        );
      });
      source.addEventListener('error', () => {
        source?.close();
        source = null;
        if (isClosed) return;

        update({ state: 'retrying' });
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, STREAM_MAX_RETRY_MS);
      });
    };

    mockingReady.then(connect);

    return () => {
      isClosed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [planId, orgId]);

  const isCurrent = stream.planId === planId && stream.orgId === orgId;

  return {
    alerts: isCurrent ? stream.alerts : [],
    state: isCurrent ? stream.state : ('connecting' as const),
  };
};
