'use client';

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { analysisKeys, orgKeys } from '@/apis/saas/keys';
import { saasRetry } from '@/apis/saas/retry';
import { SAAS_API_BASE } from '@/consts/api-saas';
import { mockingReady } from '@/mocks/ready';
import type {
  AlertT,
  AlternativeIdT,
  BindingRequestT,
  ExecutionOrderT,
  PlanEventT,
  PlanSessionT,
  ReplanResponseT,
  ScenarioT,
  SimulationRequestT,
  SimulationRunT,
  TwinStateT,
} from '@/types/api';
import type {
  BindingT,
  DeviceRequestT,
  DeviceT,
  ForwarderAssignmentT,
  LotStatusT,
  OrgSummaryT,
  PlanPreviewT,
  PlatformLotT,
  PlatformPlanItemT,
  PlatformPlanRequestT,
  PlatformSettlementT,
  RegisteredDeviceT,
  TwinSummaryT,
} from '@/types/saas-platform';

export const PLATFORM_ENDPOINTS = {
  CATALOG: '/saas/catalog',
  LOTS: '/saas/platform/lots',
  PLANS: '/saas/platform/plans',
  PLAN_PREVIEW: '/saas/platform/plans/preview',
  PLAN_FORWARDER: (planId: string) =>
    `/saas/platform/plans/${encodeURIComponent(planId)}/forwarder`,
  SETTLEMENTS: '/saas/platform/settlements',
  ORGS: '/saas/orgs',
  DEVICES: '/saas/devices',
  DEVICE: (deviceId: string) => `/saas/devices/${encodeURIComponent(deviceId)}`,
  PLAN: (planId: string) => `/plans/${encodeURIComponent(planId)}`,
  PLAN_EVENTS: (planId: string) => `/plans/${encodeURIComponent(planId)}/events`,
  PLAN_APPLY: (planId: string) => `/plans/${encodeURIComponent(planId)}/apply`,
  PLAN_ORDERS: (planId: string) => `/plans/${encodeURIComponent(planId)}/orders`,
  COLDCHAIN_BINDINGS: '/coldchain/bindings',
  COLDCHAIN_CONTAINERS: '/coldchain/containers',
  COLDCHAIN_CONTAINER: (containerId: string) =>
    `/coldchain/containers/${encodeURIComponent(containerId)}`,
  COLDCHAIN_ALERTS_STREAM: '/coldchain/alerts/stream',
  COLDCHAIN_SIMULATE: '/coldchain/simulate',
} as const;

const SSE_RECONNECT_MS = 3_000;
const SSE_RECONNECT_MAX_MS = 30_000;
const SSE_MAX_FAILURES = 6;
export const PLATFORM_LOTS_LIMIT = 1_000;
export const PLATFORM_PLANS_LIMIT = 500;
const TWIN_POLLING_MS = 5_000;
const SIMULATOR_DEVICE_ID = 'sim-01';
const SIMULATION_INTERVAL_SECONDS = 1;
const SUMMARY_POLLING_MS = 10_000;
const PLAN_PREVIEW_TIMEOUT_MS = 30_000;

export const platformKeys = {
  all: (orgId: string) => [...orgKeys.scoped(orgId), 'platform'] as const,
  catalog: (orgId: string) => [...platformKeys.all(orgId), 'catalog'] as const,
  lots: (orgId: string) => [...platformKeys.all(orgId), 'lots'] as const,
  lotsByStatus: (orgId: string, status: LotStatusT | null) =>
    [...platformKeys.lots(orgId), status ?? 'all'] as const,
  plans: (orgId: string) => [...platformKeys.all(orgId), 'plans'] as const,
  plan: (orgId: string, planId: string) => [...platformKeys.plans(orgId), planId] as const,
  planPreview: (orgId: string, lotIds: readonly string[]) =>
    [...platformKeys.all(orgId), 'plan-preview', ...lotIds] as const,
  planOrders: (orgId: string, planId: string) =>
    [...platformKeys.plan(orgId, planId), 'orders'] as const,
  settlements: (orgId: string) => [...platformKeys.all(orgId), 'settlements'] as const,
  forwarders: (orgId: string) => [...platformKeys.all(orgId), 'forwarders'] as const,
  devices: (orgId: string) => [...platformKeys.all(orgId), 'devices'] as const,
  containers: (orgId: string, planId: string) =>
    [...platformKeys.all(orgId), 'coldchain', planId] as const,
  twin: (orgId: string, planId: string, containerId: string) =>
    [...platformKeys.containers(orgId, planId), containerId] as const,
};

export const usePlatformOrgId = () => useMe().data?.active_org.org_id ?? '';

export const postPlatformSimulation = async (request: SimulationRequestT) => {
  const { data } = await saasApi.post<SimulationRunT>(
    PLATFORM_ENDPOINTS.COLDCHAIN_SIMULATE,
    request
  );

  return data;
};

export const getPlatformCatalog = async () => {
  const { data } = await saasApi.get<ScenarioT>(PLATFORM_ENDPOINTS.CATALOG);

  return data;
};

export const getPlatformLots = async (status: LotStatusT | null) => {
  const { data } = await saasApi.get<PlatformLotT[]>(PLATFORM_ENDPOINTS.LOTS, {
    params: status ? { status, limit: PLATFORM_LOTS_LIMIT } : { limit: PLATFORM_LOTS_LIMIT },
  });

  return data;
};

export const postPlatformPlan = async (request: PlatformPlanRequestT) => {
  const { data } = await saasApi.post<PlanSessionT>(PLATFORM_ENDPOINTS.PLANS, request);

  return data;
};

export const postPlatformPlanPreview = async (request: PlatformPlanRequestT) => {
  const { data } = await saasApi.post<PlanPreviewT>(PLATFORM_ENDPOINTS.PLAN_PREVIEW, request, {
    timeout: PLAN_PREVIEW_TIMEOUT_MS,
  });

  return data;
};

export const getPlatformPlans = async () => {
  const { data } = await saasApi.get<PlatformPlanItemT[]>(PLATFORM_ENDPOINTS.PLANS, {
    params: { limit: PLATFORM_PLANS_LIMIT },
  });

  return data;
};

export const getPlatformPlan = async (planId: string) => {
  const { data } = await saasApi.get<PlanSessionT>(PLATFORM_ENDPOINTS.PLAN(planId));

  return data;
};

export const getPlatformPlanOrders = async (planId: string) => {
  const { data } = await saasApi.get<ExecutionOrderT[]>(PLATFORM_ENDPOINTS.PLAN_ORDERS(planId));

  return data;
};

export const postPlatformPlanEvent = async (planId: string, event: PlanEventT) => {
  const { data } = await saasApi.post<ReplanResponseT>(
    PLATFORM_ENDPOINTS.PLAN_EVENTS(planId),
    { event },
    { params: { llm: false } }
  );

  return data;
};

export const postPlatformPlanApply = async (
  planId: string,
  { alternativeId, replanId }: { alternativeId: AlternativeIdT; replanId: string }
) => {
  const { data } = await saasApi.post<PlanSessionT>(PLATFORM_ENDPOINTS.PLAN_APPLY(planId), {
    alternative_id: alternativeId,
    replan_id: replanId,
  });

  return data;
};

export const getPlatformSettlements = async () => {
  const { data } = await saasApi.get<PlatformSettlementT[]>(PLATFORM_ENDPOINTS.SETTLEMENTS);

  return data;
};

export const getForwarderOrgs = async () => {
  const { data } = await saasApi.get<OrgSummaryT[]>(PLATFORM_ENDPOINTS.ORGS, {
    params: { type: 'forwarder' },
  });

  return data;
};

export const putPlanForwarder = async (planId: string, forwarderOrgId: string) => {
  const { data } = await saasApi.put<ForwarderAssignmentT>(
    PLATFORM_ENDPOINTS.PLAN_FORWARDER(planId),
    { forwarder_org_id: forwarderOrgId }
  );

  return data;
};

export const deletePlanForwarder = async (planId: string) => {
  await saasApi.delete(PLATFORM_ENDPOINTS.PLAN_FORWARDER(planId));
};

export const getDevices = async () => {
  const { data } = await saasApi.get<DeviceT[]>(PLATFORM_ENDPOINTS.DEVICES);

  return data;
};

export const postDevice = async (request: DeviceRequestT) => {
  const { data } = await saasApi.post<RegisteredDeviceT>(PLATFORM_ENDPOINTS.DEVICES, request);

  return data;
};

export const deleteDevice = async (deviceId: string) => {
  await saasApi.delete(PLATFORM_ENDPOINTS.DEVICE(deviceId));
};

export const postPlatformBinding = async (request: BindingRequestT) => {
  const { data } = await saasApi.post<BindingT>(PLATFORM_ENDPOINTS.COLDCHAIN_BINDINGS, request);

  return data;
};

export const getPlanContainers = async (planId: string) => {
  const { data } = await saasApi.get<TwinSummaryT[]>(PLATFORM_ENDPOINTS.COLDCHAIN_CONTAINERS, {
    params: { plan_id: planId },
  });

  return data;
};

export const getPlanContainerTwin = async (planId: string, containerId: string) => {
  try {
    const { data } = await saasApi.get<TwinStateT>(
      PLATFORM_ENDPOINTS.COLDCHAIN_CONTAINER(containerId),
      { params: { plan_id: planId } }
    );

    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

export const platformCatalogQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: platformKeys.catalog(orgId),
    queryFn: getPlatformCatalog,
    retry: saasRetry,
    staleTime: 5 * 60 * 1000,
    enabled: !!orgId,
  });

export const platformLotsQueryOptions = (orgId: string, status: LotStatusT | null = null) =>
  queryOptions({
    queryKey: platformKeys.lotsByStatus(orgId, status),
    queryFn: () => getPlatformLots(status),
    retry: saasRetry,
    enabled: !!orgId,
  });

const sortedLotIds = (lotIds: readonly string[]) => [...new Set(lotIds)].sort();

export const platformPlanPreviewQueryOptions = (orgId: string, lotIds: readonly string[]) => {
  const ids = sortedLotIds(lotIds);

  return queryOptions({
    queryKey: platformKeys.planPreview(orgId, ids),
    queryFn: () => postPlatformPlanPreview({ lot_ids: ids }),
    retry: saasRetry,
    placeholderData: keepPreviousData,
    enabled: !!orgId && ids.length > 0,
  });
};

export const platformPlansQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: platformKeys.plans(orgId),
    queryFn: getPlatformPlans,
    retry: saasRetry,
    enabled: !!orgId,
  });

export const platformPlanQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: platformKeys.plan(orgId, planId),
    queryFn: () => getPlatformPlan(planId),
    retry: saasRetry,
    enabled: !!orgId && !!planId,
  });

export const platformPlanOrdersQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: platformKeys.planOrders(orgId, planId),
    queryFn: () => getPlatformPlanOrders(planId),
    retry: saasRetry,
    staleTime: 0,
    enabled: !!orgId && !!planId,
  });

export const platformSettlementsQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: platformKeys.settlements(orgId),
    queryFn: getPlatformSettlements,
    retry: saasRetry,
    enabled: !!orgId,
  });

export const forwarderOrgsQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: platformKeys.forwarders(orgId),
    queryFn: getForwarderOrgs,
    retry: saasRetry,
    staleTime: 5 * 60 * 1000,
    enabled: !!orgId,
  });

export const devicesQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: platformKeys.devices(orgId),
    queryFn: getDevices,
    retry: saasRetry,
    enabled: !!orgId,
  });

export const planContainersQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: platformKeys.containers(orgId, planId),
    queryFn: () => getPlanContainers(planId),
    retry: saasRetry,
    refetchInterval: SUMMARY_POLLING_MS,
    enabled: !!orgId && !!planId,
  });

export const planContainerTwinQueryOptions = (orgId: string, planId: string, containerId: string) =>
  queryOptions({
    queryKey: platformKeys.twin(orgId, planId, containerId),
    queryFn: () => getPlanContainerTwin(planId, containerId),
    retry: saasRetry,
    staleTime: 0,
    refetchInterval: TWIN_POLLING_MS,
    enabled: !!orgId && !!planId && !!containerId,
  });

export const usePlatformLots = (status: LotStatusT | null = null) =>
  useQuery(platformLotsQueryOptions(usePlatformOrgId(), status));

export const usePlatformCatalog = () => useQuery(platformCatalogQueryOptions(usePlatformOrgId()));

export const usePlatformPlans = () => useQuery(platformPlansQueryOptions(usePlatformOrgId()));

export const usePlatformPlanPreview = (lotIds: readonly string[]) =>
  useQuery(platformPlanPreviewQueryOptions(usePlatformOrgId(), lotIds));

export const usePlatformPlan = (planId: string) =>
  useQuery(platformPlanQueryOptions(usePlatformOrgId(), planId));

export const usePlatformPlanOrders = (planId: string) =>
  useQuery(platformPlanOrdersQueryOptions(usePlatformOrgId(), planId));

export const usePlatformSettlements = () =>
  useQuery(platformSettlementsQueryOptions(usePlatformOrgId()));

export const useForwarderOrgs = () => useQuery(forwarderOrgsQueryOptions(usePlatformOrgId()));

export const useDevices = () => useQuery(devicesQueryOptions(usePlatformOrgId()));

export const usePlanContainers = (planId: string) =>
  useQuery(planContainersQueryOptions(usePlatformOrgId(), planId));

export const usePlanContainerTwin = (planId: string, containerId: string) =>
  useQuery(planContainerTwinQueryOptions(usePlatformOrgId(), planId, containerId));

export const useCreatePlatformPlan = () => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();

  return useMutation({
    mutationFn: postPlatformPlan,
    onSuccess: session => {
      queryClient.setQueryData(platformKeys.plan(orgId, session.plan_id), session);
      queryClient.invalidateQueries({ queryKey: platformKeys.lots(orgId) });
      queryClient.invalidateQueries({ queryKey: platformKeys.plans(orgId), exact: true });
      queryClient.invalidateQueries({ queryKey: platformKeys.settlements(orgId) });
    },
  });
};

export const useAssignForwarder = (planId: string) => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();

  const syncList = (forwarder: PlatformPlanItemT['forwarder']) =>
    queryClient.setQueryData<PlatformPlanItemT[]>(platformKeys.plans(orgId), items =>
      items?.map(item => (item.plan_id === planId ? { ...item, forwarder } : item))
    );

  const assign = useMutation({
    mutationFn: (forwarderOrgId: string) => putPlanForwarder(planId, forwarderOrgId),
    onSuccess: ({ forwarder }) => {
      syncList(forwarder);
      toast.success(`${forwarder.org_name}에 배정했습니다.`);
    },
    onError: toastSaasError('포워더를 배정하지 못했습니다.'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: platformKeys.plans(orgId), exact: true }),
  });

  const unassign = useMutation({
    mutationFn: () => deletePlanForwarder(planId),
    onSuccess: () => {
      syncList(null);
      toast.success('포워더 배정을 해제했습니다.');
    },
    onError: toastSaasError('배정을 해제하지 못했습니다.'),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: platformKeys.plans(orgId), exact: true }),
  });

  return { assign, unassign };
};

export const useRegisterDevice = () => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();

  return useMutation({
    mutationFn: postDevice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: platformKeys.devices(orgId) }),
  });
};

export const useDeleteDevice = () => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();

  return useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformKeys.devices(orgId) });
      toast.success('기기를 삭제했습니다.');
    },
    onError: toastSaasError('기기를 삭제하지 못했습니다.'),
  });
};

export const useBindDevice = () => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();

  return useMutation({
    mutationFn: postPlatformBinding,
    onSuccess: binding => {
      queryClient.invalidateQueries({ queryKey: platformKeys.devices(orgId) });
      toast.success(`${binding.device_id} 기기를 ${binding.container_id}에 연결했습니다.`);
    },
    onError: toastSaasError('기기를 컨테이너에 연결하지 못했습니다.'),
  });
};

export const usePlatformSimulation = (planId: string) => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();

  return useMutation({
    mutationFn: (containerId: string) =>
      postPlatformSimulation({
        preset: 'power_cut_restore',
        container_id: containerId,
        plan_id: planId,
        device_id: SIMULATOR_DEVICE_ID,
        stage: 'terminal',
        interval_seconds: SIMULATION_INTERVAL_SECONDS,
        reset: true,
      }),
    onSuccess: (_run, containerId) => {
      queryClient.invalidateQueries({ queryKey: platformKeys.containers(orgId, planId) });
      toast.success(`${containerId} 단전 시뮬레이션을 시작했습니다.`);
    },
    onError: toastSaasError('시뮬레이션을 시작하지 못했습니다.'),
  });
};

export const usePlatformReplanFlow = (planId: string) => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();

  const [external, setExternal] = useState<{
    planId: string;
    result: ReplanResponseT;
  } | null>(null);
  const externalReplan = external?.planId === planId ? external.result : null;

  const replan = useMutation({
    mutationFn: (event: PlanEventT) => postPlatformPlanEvent(planId, event),
    onError: toastSaasError('재최적화하지 못했습니다.'),
  });

  const replanResult = externalReplan ?? replan.data ?? null;

  const apply = useMutation({
    mutationFn: (alternativeId: AlternativeIdT) =>
      postPlatformPlanApply(planId, { alternativeId, replanId: replanResult?.replan_id ?? '' }),
    onSuccess: updated => {
      queryClient.setQueryData(platformKeys.plan(orgId, planId), updated);
      queryClient.invalidateQueries({ queryKey: platformKeys.planOrders(orgId, planId) });
      queryClient.invalidateQueries({ queryKey: platformKeys.plans(orgId), exact: true });
      queryClient.invalidateQueries({ queryKey: platformKeys.settlements(orgId) });
      queryClient.invalidateQueries({ queryKey: analysisKeys.plan(orgId, planId) });
      toast.success('대안을 적용했습니다. 화주·포워더 확정을 기다립니다.');
    },
    onError: toastSaasError('대안을 적용하지 못했습니다.'),
  });

  const { data: orders } = useQuery(platformPlanOrdersQueryOptions(orgId, planId));

  return {
    replanResult,
    isReplanning: replan.isPending,
    runReplan: (event: PlanEventT) => {
      apply.reset();
      setExternal(null);
      replan.mutate(event);
    },
    loadExternalReplan: (result: ReplanResponseT | null) => {
      apply.reset();
      replan.reset();
      setExternal(result?.plan_id === planId ? { planId, result } : null);
    },
    isExternalReplan: externalReplan !== null,
    appliedId: apply.isSuccess ? apply.variables : null,
    applyingId: apply.isPending ? apply.variables : null,
    applyAlternative: (alternativeId: AlternativeIdT) => apply.mutate(alternativeId),
    latestOrder: orders?.at(-1) ?? null,
  };
};

const toAlertKey = ({ container_id, key }: AlertT) => `${container_id}:${key}`;

export type AlertStreamStatusT = 'connecting' | 'open' | 'reconnecting' | 'stopped';

export const usePlatformAlertStream = (planId: string, onAlert?: (alert: AlertT) => void) => {
  const [alerts, setAlerts] = useState<AlertT[]>([]);
  const [status, setStatus] = useState<AlertStreamStatusT>('connecting');
  const [attempt, setAttempt] = useState(0);
  const onAlertRef = useRef(onAlert);
  const cursorRef = useRef({ planId, seen: new Set<number>(), lastSeq: 0 });

  useEffect(() => {
    onAlertRef.current = onAlert;
  });

  useEffect(() => {
    if (!planId) return;

    if (cursorRef.current.planId !== planId) {
      cursorRef.current = { planId, seen: new Set<number>(), lastSeq: 0 };
    }
    const cursor = cursorRef.current;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let isClosed = false;
    let failures = 0;

    const connect = () => {
      if (isClosed) return;

      const params = new URLSearchParams({ plan_id: planId, since: String(cursor.lastSeq) });
      source = new EventSource(
        `${SAAS_API_BASE}${PLATFORM_ENDPOINTS.COLDCHAIN_ALERTS_STREAM}?${params}`,
        { withCredentials: true }
      );
      source.addEventListener('open', () => {
        failures = 0;
        setStatus('open');
      });
      source.addEventListener('alert', event => {
        const alert = JSON.parse((event as MessageEvent<string>).data) as AlertT;
        cursor.lastSeq = Math.max(cursor.lastSeq, alert.seq);
        if (cursor.seen.has(alert.seq)) return;

        cursor.seen.add(alert.seq);
        const alertKey = toAlertKey(alert);
        setAlerts(prev => [alert, ...prev.filter(item => toAlertKey(item) !== alertKey)]);
        onAlertRef.current?.(alert);
      });
      source.addEventListener('error', () => {
        source?.close();
        source = null;
        if (isClosed) return;

        failures += 1;
        if (failures >= SSE_MAX_FAILURES) {
          setStatus('stopped');
          return;
        }

        setStatus('reconnecting');
        retryTimer = setTimeout(
          connect,
          Math.min(SSE_RECONNECT_MS * 2 ** (failures - 1), SSE_RECONNECT_MAX_MS)
        );
      });
    };

    mockingReady.then(connect);

    return () => {
      isClosed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [planId, attempt]);

  return {
    alerts,
    status,
    reconnect: () => {
      setStatus('connecting');
      setAttempt(value => value + 1);
    },
  };
};
