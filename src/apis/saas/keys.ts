import type { PlatformFuelShockRequestT } from '@/types/saas-analysis';

export const orgKeys = {
  all: ['org'] as const,
  me: ['org', 'me'] as const,
  scoped: (orgId: string) => ['org', orgId] as const,
  list: (orgId: string, resource: string) => ['org', orgId, resource] as const,
  detail: (orgId: string, resource: string, id: string) => ['org', orgId, resource, id] as const,
};

export const analysisKeys = {
  all: (orgId: string) => [...orgKeys.scoped(orgId), 'analysis'] as const,
  plan: (orgId: string, planId: string) => [...analysisKeys.all(orgId), 'plan', planId] as const,
  fuelShock: (orgId: string, planId: string, request: PlatformFuelShockRequestT) =>
    [...analysisKeys.plan(orgId, planId), 'fuel-shock', request] as const,
  airSea: (orgId: string, planId: string, lotId: string) =>
    [...analysisKeys.plan(orgId, planId), 'air-vs-sea', lotId] as const,
  settlementPreviews: (orgId: string, planId: string) =>
    [...analysisKeys.plan(orgId, planId), 'settlement-preview'] as const,
  settlementPreview: (orgId: string, planId: string, containerId: string) =>
    [...analysisKeys.settlementPreviews(orgId, planId), containerId] as const,
  benchmark: (orgId: string, planId: string | null, scenarioId: string) =>
    planId
      ? ([...analysisKeys.plan(orgId, planId), 'benchmark', scenarioId] as const)
      : ([...analysisKeys.all(orgId), 'benchmark', scenarioId] as const),
  congestion: (orgId: string, includeVessels: boolean) =>
    [...analysisKeys.all(orgId), 'ulsan-congestion', includeVessels] as const,
  provenance: (orgId: string, scenarioId: string) =>
    [...analysisKeys.all(orgId), 'provenance', scenarioId] as const,
  lossRates: (orgId: string, scenarioId: string) =>
    [...analysisKeys.all(orgId), 'loss-rates', scenarioId] as const,
};
