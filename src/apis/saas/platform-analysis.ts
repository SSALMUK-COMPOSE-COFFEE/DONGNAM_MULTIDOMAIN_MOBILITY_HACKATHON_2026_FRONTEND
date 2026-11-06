'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { saasApi } from '@/apis/saas/client';
import { saasErrorDetail, saasErrorStatus, toastSaasError } from '@/apis/saas/errors';
import { analysisKeys } from '@/apis/saas/keys';
import { invalidatePlatformMetrics, platformKeys, usePlatformOrgId } from '@/apis/saas/platform';
import { saasRetry } from '@/apis/saas/retry';
import type { ReplanResponseT } from '@/types/api';
import type {
  AirSeaComparisonT,
  ArrivalRequestT,
  ArrivalSettlementResultT,
  BenchmarkResultT,
  DelayForecastRequestT,
  DelayForecastResponseT,
  ForecastPresetT,
  LossTableT,
  PlatformFuelShockRequestT,
  PlatformFuelShockResultT,
  PortCongestionT,
  ProvenanceCatalogT,
  ScheduleCheckInputT,
  ScheduleCheckResponseT,
  SettlementPreviewT,
} from '@/types/saas-analysis';

export const ANALYSIS_ENDPOINTS = {
  FUEL_SHOCK: '/analysis/fuel-shock',
  BENCHMARK: '/analysis/benchmark',
  AIR_VS_SEA: '/compare/air-vs-sea',
  DELAY_FORECAST: (planId: string) => `/plans/${encodeURIComponent(planId)}/delay-forecast`,
  SCHEDULE_CHECK: (planId: string) => `/plans/${encodeURIComponent(planId)}/schedule-check`,
  SETTLEMENT_ARRIVAL: (planId: string) => `/plans/${encodeURIComponent(planId)}/settlement/arrival`,
  SETTLEMENT_PREVIEW: (containerId: string) =>
    `/coldchain/containers/${encodeURIComponent(containerId)}/settlement-preview`,
  ULSAN_CONGESTION: '/vessels/ulsan/congestion',
  PROVENANCE: '/data/provenance',
  LOSS_RATES: '/quality/loss-rates',
} as const;

export { analysisKeys };

export const DEFAULT_SCENARIO_ID = 'default';
export const TYPHOON_PRESET: ForecastPresetT = 'typhoon';

const ANALYSIS_TIMEOUT_MS = 30_000;
const REFERENCE_STALE_MS = 5 * 60 * 1000;
const SETTLEMENT_PREVIEW_POLLING_MS = 10_000;
const NO_READINGS_PREFIX = '센서 기록이 없는 컨테이너입니다';

export const forecastReplan = (forecast: DelayForecastResponseT | null): ReplanResponseT | null =>
  forecast?.replan ?? null;

export const postPlatformFuelShock = async (
  planId: string,
  request: PlatformFuelShockRequestT = {}
) => {
  const { data } = await saasApi.post<PlatformFuelShockResultT>(
    ANALYSIS_ENDPOINTS.FUEL_SHOCK,
    { ...request, plan_id: planId },
    { timeout: ANALYSIS_TIMEOUT_MS }
  );

  return data;
};

export const postPlatformDelayForecast = async (
  planId: string,
  request: DelayForecastRequestT = {}
) => {
  const { data } = await saasApi.post<DelayForecastResponseT>(
    ANALYSIS_ENDPOINTS.DELAY_FORECAST(planId),
    request,
    { params: { llm: false }, timeout: ANALYSIS_TIMEOUT_MS }
  );

  return data;
};

export const postPlatformScheduleCheck = async (
  planId: string,
  { demo = false, ...request }: ScheduleCheckInputT = {}
) => {
  const { data } = await saasApi.post<ScheduleCheckResponseT>(
    ANALYSIS_ENDPOINTS.SCHEDULE_CHECK(planId),
    request,
    { params: { demo }, timeout: ANALYSIS_TIMEOUT_MS }
  );

  return data;
};

export const postPlatformAirSeaCompare = async (planId: string, lotId: string) => {
  const { data } = await saasApi.post<AirSeaComparisonT>(ANALYSIS_ENDPOINTS.AIR_VS_SEA, {
    plan_id: planId,
    lot_id: lotId,
  });

  return data;
};

export const postPlatformBenchmark = async (planId: string | null, scenarioId: string) => {
  const { data } = await saasApi.post<BenchmarkResultT>(
    ANALYSIS_ENDPOINTS.BENCHMARK,
    { scenario_id: scenarioId, plan_id: planId },
    { timeout: ANALYSIS_TIMEOUT_MS }
  );

  return data;
};

const isNoReadings = (error: unknown) =>
  saasErrorStatus(error) === 404 && !!saasErrorDetail(error)?.startsWith(NO_READINGS_PREFIX);

const samePlanResult = (planId: string) => (previous?: PlatformFuelShockResultT) => {
  if (previous?.plan_id === planId) return previous;
};

export const getSettlementPreview = async (planId: string, containerId: string) => {
  try {
    const { data } = await saasApi.get<SettlementPreviewT>(
      ANALYSIS_ENDPOINTS.SETTLEMENT_PREVIEW(containerId),
      { params: { plan_id: planId } }
    );

    return data;
  } catch (error) {
    if (isNoReadings(error)) return null;
    throw error;
  }
};

export const postArrivalInspection = async (planId: string, request: ArrivalRequestT) => {
  const { data } = await saasApi.post<ArrivalSettlementResultT>(
    ANALYSIS_ENDPOINTS.SETTLEMENT_ARRIVAL(planId),
    request
  );

  return data;
};

export const getVesselsCongestion = async (includeVessels: boolean) => {
  const { data } = await saasApi.get<PortCongestionT>(ANALYSIS_ENDPOINTS.ULSAN_CONGESTION, {
    params: { include_vessels: includeVessels },
  });

  return data;
};

export const getProvenance = async (scenarioId: string) => {
  const { data } = await saasApi.get<ProvenanceCatalogT>(ANALYSIS_ENDPOINTS.PROVENANCE, {
    params: { scenario_id: scenarioId },
  });

  return data;
};

export const getLearnedLossRates = async (scenarioId: string) => {
  const { data } = await saasApi.get<LossTableT>(ANALYSIS_ENDPOINTS.LOSS_RATES, {
    params: { scenario_id: scenarioId },
  });

  return data;
};

export const platformFuelShockQueryOptions = (
  orgId: string,
  planId: string,
  request: PlatformFuelShockRequestT = {}
) =>
  queryOptions({
    queryKey: analysisKeys.fuelShock(orgId, planId, request),
    queryFn: () => postPlatformFuelShock(planId, request),
    retry: saasRetry,
    placeholderData: samePlanResult(planId),
    enabled: !!orgId && !!planId,
  });

export const platformAirSeaCompareQueryOptions = (orgId: string, planId: string, lotId: string) =>
  queryOptions({
    queryKey: analysisKeys.airSea(orgId, planId, lotId),
    queryFn: () => postPlatformAirSeaCompare(planId, lotId),
    retry: saasRetry,
    enabled: !!orgId && !!planId && !!lotId,
  });

export const platformBenchmarkQueryOptions = (
  orgId: string,
  planId: string | null,
  scenarioId: string
) =>
  queryOptions({
    queryKey: analysisKeys.benchmark(orgId, planId, scenarioId),
    queryFn: () => postPlatformBenchmark(planId, scenarioId),
    retry: saasRetry,
    staleTime: REFERENCE_STALE_MS,
    enabled: !!orgId && !!scenarioId,
  });

export const settlementPreviewQueryOptions = (orgId: string, planId: string, containerId: string) =>
  queryOptions({
    queryKey: analysisKeys.settlementPreview(orgId, planId, containerId),
    queryFn: () => getSettlementPreview(planId, containerId),
    retry: saasRetry,
    staleTime: 0,
    refetchInterval: query =>
      query.state.status === 'error' ? false : SETTLEMENT_PREVIEW_POLLING_MS,
    enabled: !!orgId && !!planId && !!containerId,
  });

export const vesselsCongestionQueryOptions = (orgId: string, includeVessels: boolean) =>
  queryOptions({
    queryKey: analysisKeys.congestion(orgId, includeVessels),
    queryFn: () => getVesselsCongestion(includeVessels),
    retry: saasRetry,
    staleTime: REFERENCE_STALE_MS,
    enabled: !!orgId,
  });

export const provenanceQueryOptions = (orgId: string, scenarioId: string) =>
  queryOptions({
    queryKey: analysisKeys.provenance(orgId, scenarioId),
    queryFn: () => getProvenance(scenarioId),
    retry: saasRetry,
    staleTime: REFERENCE_STALE_MS,
    enabled: !!orgId && !!scenarioId,
  });

export const learnedLossRatesQueryOptions = (orgId: string, scenarioId: string) =>
  queryOptions({
    queryKey: analysisKeys.lossRates(orgId, scenarioId),
    queryFn: () => getLearnedLossRates(scenarioId),
    retry: saasRetry,
    enabled: !!orgId && !!scenarioId,
  });

export const usePlatformFuelShock = (planId: string, request: PlatformFuelShockRequestT = {}) =>
  useQuery(platformFuelShockQueryOptions(usePlatformOrgId(), planId, request));

export const usePlatformAirSeaCompare = (planId: string, lotId: string) =>
  useQuery(platformAirSeaCompareQueryOptions(usePlatformOrgId(), planId, lotId));

export const usePlatformBenchmark = (
  planId: string | null = null,
  scenarioId: string = DEFAULT_SCENARIO_ID
) => useQuery(platformBenchmarkQueryOptions(usePlatformOrgId(), planId, scenarioId));

export const useSettlementPreview = (planId: string, containerId: string) =>
  useQuery(settlementPreviewQueryOptions(usePlatformOrgId(), planId, containerId));

export const useVesselsCongestion = (includeVessels = true) =>
  useQuery(vesselsCongestionQueryOptions(usePlatformOrgId(), includeVessels));

export const useProvenance = (scenarioId: string = DEFAULT_SCENARIO_ID) =>
  useQuery(provenanceQueryOptions(usePlatformOrgId(), scenarioId));

export const useLearnedLossRates = (scenarioId: string = DEFAULT_SCENARIO_ID) =>
  useQuery(learnedLossRatesQueryOptions(usePlatformOrgId(), scenarioId));

export const usePlatformDelayForecast = (planId: string) =>
  useMutation({
    mutationFn: (request: DelayForecastRequestT = {}) => postPlatformDelayForecast(planId, request),
    onError: toastSaasError('지연 예측을 계산하지 못했습니다.'),
  });

export const usePlatformScheduleCheck = (planId: string) =>
  useMutation({
    mutationFn: (input: ScheduleCheckInputT = {}) => postPlatformScheduleCheck(planId, input),
    onError: toastSaasError('선박 일정을 확인하지 못했습니다.'),
  });

export const useArrivalInspection = (planId: string) => {
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();

  return useMutation({
    mutationFn: (request: ArrivalRequestT) => postArrivalInspection(planId, request),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: platformKeys.plan(orgId, planId) });
      queryClient.invalidateQueries({ queryKey: platformKeys.settlements(orgId) });
      queryClient.invalidateQueries({ queryKey: analysisKeys.plan(orgId, planId) });
      queryClient.invalidateQueries({ queryKey: [...analysisKeys.all(orgId), 'loss-rates'] });
      invalidatePlatformMetrics(queryClient, orgId);
      toast.success(`${result.lot_id} 도착 검수를 반영했습니다.`);
    },
    onError: toastSaasError('도착 검수를 반영하지 못했습니다.'),
  });
};
