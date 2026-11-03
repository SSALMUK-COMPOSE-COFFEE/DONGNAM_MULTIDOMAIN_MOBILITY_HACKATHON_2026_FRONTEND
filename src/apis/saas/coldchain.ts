'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { orgKeys } from '@/apis/saas/keys';
import { usePlatformAlertStream, usePlatformSimulation } from '@/apis/saas/platform';
import { settlementPreviewQueryOptions } from '@/apis/saas/platform-analysis';
import { saasRetry } from '@/apis/saas/retry';
import type { AlertT } from '@/types/api';
import type { SaasSchemaT } from '@/types/api-saas';
import type {
  ColdchainActionUpdateT,
  ColdchainResidualRiskT,
  PowerPlanT,
  TwinSummaryT,
} from '@/types/saas-platform';

export type ColdchainActionT = SaasSchemaT<'ColdchainAction'>;
export type ColdchainActionStatusT = ColdchainActionT['status'];
export type ColdchainRequestDraftT = SaasSchemaT<'RequestDraft'>;
export type ColdchainAlertT = SaasSchemaT<'Alert'>;
export type ColdchainAlertFeedT = SaasSchemaT<'AlertFeed'>;
export type ColdchainLossT = SaasSchemaT<'LossSummary'>;
export type ColdchainLotLossT = SaasSchemaT<'LotLoss'>;
export type ColdchainShipperLossT = SaasSchemaT<'ShipperLoss'>;
export type ColdchainPresetT = SaasSchemaT<'PresetInfo'>;
export type ColdchainTwinT = Omit<SaasSchemaT<'TwinState'>, 'residual_risks'> & {
  residual_risks: ColdchainResidualRiskT[];
};
export type ColdchainSummaryT = TwinSummaryT;
export type ColdchainCsvKindT = 'readings' | 'outages';
export type ColdchainActionVariablesT = { key: string; note?: ColdchainActionUpdateT['note'] };
export type ColdchainActionStepT = 'accept' | 'complete';

const segment = encodeURIComponent;

export const COLDCHAIN_ENDPOINTS = {
  CONTAINERS: '/coldchain/containers',
  CONTAINER: (cid: string) => `/coldchain/containers/${segment(cid)}`,
  ACCEPT: (cid: string, key: string) =>
    `/coldchain/containers/${segment(cid)}/actions/${segment(key)}/accept`,
  COMPLETE: (cid: string, key: string) =>
    `/coldchain/containers/${segment(cid)}/actions/${segment(key)}/complete`,
  CSV: (cid: string, kind: ColdchainCsvKindT) =>
    `/coldchain/containers/${segment(cid)}/${kind}.csv`,
  POWER_PLAN: (planId: string) => `/coldchain/plans/${segment(planId)}/power-plan`,
  ALERTS: '/coldchain/alerts',
  STREAM: '/coldchain/alerts/stream',
  PRESETS: '/coldchain/simulate/presets',
} as const;

const CONTAINERS_POLLING_MS = 10_000;
const TWIN_POLLING_MS = 5_000;
const TWIN_POINTS = 720;
const POWER_PLAN_STALE_MS = 60_000;
const PRESETS_STALE_MS = 5 * 60 * 1000;
const ALERTS_LIMIT = 100;
const FILENAME_PATTERN = /filename="?([^";]+)"?/;

export const CSV_LABEL: Record<ColdchainCsvKindT, string> = {
  readings: '측정 기록',
  outages: '단전 기록',
};

export const coldchainKeys = {
  all: (orgId: string) => [...orgKeys.scoped(orgId), 'coldchain'] as const,
  presets: (orgId: string) => [...coldchainKeys.all(orgId), 'presets'] as const,
  plan: (orgId: string, planId: string) => [...coldchainKeys.all(orgId), planId] as const,
  containers: (orgId: string, planId: string) =>
    [...coldchainKeys.plan(orgId, planId), 'containers'] as const,
  twin: (orgId: string, planId: string, cid: string) =>
    [...coldchainKeys.containers(orgId, planId), cid] as const,
  powerPlan: (orgId: string, planId: string) =>
    [...coldchainKeys.plan(orgId, planId), 'power-plan'] as const,
  alerts: (orgId: string, planId: string, cid: string) =>
    [...coldchainKeys.plan(orgId, planId), 'alerts', cid] as const,
};

export const useColdchainOrgId = () => useMe().data?.active_org.org_id ?? '';

const normalizeTwin = (twin: SaasSchemaT<'TwinState'>): ColdchainTwinT => ({
  ...twin,
  has_data: twin.has_data ?? true,
  residual_risks: twin.residual_risks ?? [],
});

export const getColdchainContainers = async (planId: string) => {
  const { data } = await saasApi.get<ColdchainSummaryT[]>(COLDCHAIN_ENDPOINTS.CONTAINERS, {
    params: { plan_id: planId },
  });

  return data;
};

export const getColdchainTwin = async (planId: string, cid: string) => {
  try {
    const { data } = await saasApi.get<SaasSchemaT<'TwinState'>>(
      COLDCHAIN_ENDPOINTS.CONTAINER(cid),
      { params: { plan_id: planId, points: TWIN_POINTS } }
    );

    return normalizeTwin(data);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
};

export const getPowerPlan = async (planId: string) => {
  const { data } = await saasApi.get<PowerPlanT>(COLDCHAIN_ENDPOINTS.POWER_PLAN(planId));

  return data;
};

export const getColdchainAlerts = async (planId: string, cid: string) => {
  const { data } = await saasApi.get<ColdchainAlertFeedT>(COLDCHAIN_ENDPOINTS.ALERTS, {
    params: cid
      ? { plan_id: planId, since: 0, container_id: cid, limit: ALERTS_LIMIT }
      : { plan_id: planId, since: 0, limit: ALERTS_LIMIT },
  });

  return data;
};

export const getColdchainPresets = async () => {
  const { data } = await saasApi.get<ColdchainPresetT[]>(COLDCHAIN_ENDPOINTS.PRESETS);

  return data;
};

export const postColdchainAction = async (
  step: ColdchainActionStepT,
  planId: string,
  cid: string,
  variables: ColdchainActionVariablesT
) => {
  const path =
    step === 'accept'
      ? COLDCHAIN_ENDPOINTS.ACCEPT(cid, variables.key)
      : COLDCHAIN_ENDPOINTS.COMPLETE(cid, variables.key);
  const body: ColdchainActionUpdateT | null =
    'note' in variables ? { note: variables.note ?? null } : null;
  const { data } = await saasApi.post<ColdchainActionT>(path, body, {
    params: { plan_id: planId },
  });

  return data;
};

const csvFilename = (disposition: unknown, fallback: string) => {
  if (typeof disposition !== 'string') return fallback;

  return FILENAME_PATTERN.exec(disposition)?.[1] ?? fallback;
};

const unwrapBlobError = async (error: unknown) => {
  if (!isAxiosError(error) || !(error.response?.data instanceof Blob)) return error;

  try {
    error.response.data = JSON.parse(await error.response.data.text()) as unknown;
  } catch {
    error.response.data = null;
  }

  return error;
};

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const downloadContainerCsv = async (
  planId: string,
  cid: string,
  kind: ColdchainCsvKindT
) => {
  try {
    const response = await saasApi.get<Blob>(COLDCHAIN_ENDPOINTS.CSV(cid, kind), {
      params: { plan_id: planId },
      responseType: 'blob',
    });
    const filename = csvFilename(response.headers['content-disposition'], `${cid}-${kind}.csv`);
    saveBlob(response.data, filename);

    return filename;
  } catch (error) {
    throw await unwrapBlobError(error);
  }
};

export const coldchainContainersQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: coldchainKeys.containers(orgId, planId),
    queryFn: () => getColdchainContainers(planId),
    retry: saasRetry,
    staleTime: 0,
    refetchInterval: CONTAINERS_POLLING_MS,
    enabled: !!orgId && !!planId,
  });

export const coldchainTwinQueryOptions = (orgId: string, planId: string, cid: string) =>
  queryOptions({
    queryKey: coldchainKeys.twin(orgId, planId, cid),
    queryFn: () => getColdchainTwin(planId, cid),
    retry: saasRetry,
    staleTime: 0,
    refetchInterval: TWIN_POLLING_MS,
    enabled: !!orgId && !!planId && !!cid,
  });

export const powerPlanQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: coldchainKeys.powerPlan(orgId, planId),
    queryFn: () => getPowerPlan(planId),
    retry: saasRetry,
    staleTime: POWER_PLAN_STALE_MS,
    enabled: !!orgId && !!planId,
  });

export const coldchainAlertsQueryOptions = (orgId: string, planId: string, cid = '') =>
  queryOptions({
    queryKey: coldchainKeys.alerts(orgId, planId, cid),
    queryFn: () => getColdchainAlerts(planId, cid),
    retry: saasRetry,
    staleTime: 0,
    enabled: !!orgId && !!planId,
  });

export const coldchainPresetsQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: coldchainKeys.presets(orgId),
    queryFn: getColdchainPresets,
    retry: saasRetry,
    staleTime: PRESETS_STALE_MS,
    enabled: !!orgId,
  });

export const useColdchainContainers = (planId: string) =>
  useQuery(coldchainContainersQueryOptions(useColdchainOrgId(), planId));

export const useColdchainTwin = (planId: string, cid: string) =>
  useQuery(coldchainTwinQueryOptions(useColdchainOrgId(), planId, cid));

export const usePowerPlan = (planId: string) =>
  useQuery(powerPlanQueryOptions(useColdchainOrgId(), planId));

export const useColdchainAlerts = (planId: string, cid = '') =>
  useQuery(coldchainAlertsQueryOptions(useColdchainOrgId(), planId, cid));

export const useColdchainPresets = () =>
  useQuery(coldchainPresetsQueryOptions(useColdchainOrgId()));

export const useColdchainSettlementPreview = (
  planId: string,
  containerId: string,
  hasData: boolean
) => {
  const options = settlementPreviewQueryOptions(useColdchainOrgId(), planId, containerId);

  return useQuery({ ...options, enabled: options.enabled !== false && hasData });
};

export const useColdchainSimulation = usePlatformSimulation;

const ACTION_SUCCESS: Record<ColdchainActionStepT, string> = {
  accept: '조치를 수락했습니다.',
  complete: '조치를 완료했습니다.',
};

const patchTwinAction = (twin: ColdchainTwinT | null | undefined, action: ColdchainActionT) => {
  if (!twin) return twin;

  return {
    ...twin,
    actions: twin.actions.map(item => (item.key === action.key ? action : item)),
  };
};

const useColdchainActionMutation = (
  step: ColdchainActionStepT,
  planId: string,
  containerId: string
) => {
  const queryClient = useQueryClient();
  const orgId = useColdchainOrgId();

  return useMutation({
    mutationFn: (variables: ColdchainActionVariablesT) =>
      postColdchainAction(step, planId, containerId, variables),
    onSuccess: action => {
      queryClient.setQueryData<ColdchainTwinT | null>(
        coldchainKeys.twin(orgId, planId, containerId),
        twin => patchTwinAction(twin, action)
      );
      toast.success(ACTION_SUCCESS[step]);
    },
    onError: toastSaasError('조치를 기록하지 못했습니다.'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: orgKeys.scoped(orgId) }),
  });
};

export const useAcceptColdchainAction = (planId: string, containerId: string) =>
  useColdchainActionMutation('accept', planId, containerId);

export const useCompleteColdchainAction = (planId: string, containerId: string) =>
  useColdchainActionMutation('complete', planId, containerId);

export const useDownloadContainerCsv = (planId: string, containerId: string) =>
  useMutation({
    mutationFn: (kind: ColdchainCsvKindT) => downloadContainerCsv(planId, containerId, kind),
    onSuccess: (_filename, kind) =>
      toast.success(`${containerId} ${CSV_LABEL[kind]}을 내려받았습니다.`),
    onError: (error, kind) => toastSaasError(`${CSV_LABEL[kind]}을 내려받지 못했습니다.`)(error),
  });

const asColdchainAlert = (alert: AlertT) => alert as ColdchainAlertT;

export const useColdchainAlertStream = (
  planId: string,
  onAlert?: (alert: ColdchainAlertT) => void
) => {
  const handleAlert = useCallback((alert: AlertT) => onAlert?.(asColdchainAlert(alert)), [onAlert]);
  const stream = usePlatformAlertStream(planId, handleAlert);

  const alerts = useMemo(() => stream.alerts.map(asColdchainAlert), [stream.alerts]);

  return { ...stream, alerts };
};

export const openActionCount = (actions: readonly ColdchainActionT[]) =>
  actions.filter(action => action.status !== 'done').length;

const touchesLots = (lotIds: readonly string[] | null | undefined, own: ReadonlySet<string>) =>
  (lotIds ?? []).some(lotId => own.has(lotId));

export const shipperScopedAction = (
  action: ColdchainActionT,
  ownLotIds: ReadonlySet<string>
): ColdchainActionT => ({
  ...action,
  lot_ids: (action.lot_ids ?? []).filter(lotId => ownLotIds.has(lotId)),
  note: null,
  accepted_by: null,
  done_by: null,
});

export const shipperScopedActions = (
  actions: readonly ColdchainActionT[],
  ownLotIds: ReadonlySet<string>
) =>
  actions
    .filter(action => touchesLots(action.lot_ids, ownLotIds))
    .map(action => shipperScopedAction(action, ownLotIds));

export const shipperScopedAlert = (
  alert: ColdchainAlertT,
  ownLotIds: ReadonlySet<string>
): ColdchainAlertT => ({
  ...alert,
  action: alert.action ? shipperScopedAction(alert.action, ownLotIds) : null,
});

const sumOf = (lots: readonly ColdchainLotLossT[], pick: (lot: ColdchainLotLossT) => number) =>
  lots.length > 0 ? lots.reduce((sum, lot) => sum + pick(lot), 0) : null;

export const shipperScopedTwin = (
  twin: ColdchainTwinT,
  ownLotIds: ReadonlySet<string>
): ColdchainTwinT => {
  const lots = (twin.loss.lots ?? []).filter(lot => ownLotIds.has(lot.lot_id));

  return {
    ...twin,
    actions: shipperScopedActions(twin.actions, ownLotIds),
    alerts: twin.alerts.map(alert => shipperScopedAlert(alert, ownLotIds)),
    loss: {
      ...twin.loss,
      cargo_value: null,
      planned_loss_krw: sumOf(lots, lot => lot.planned_loss_krw),
      predicted_loss_krw: sumOf(lots, lot => lot.predicted_loss_krw),
      delta_krw: sumOf(lots, lot => lot.delta_krw),
      lots,
      shippers: (twin.loss.shippers ?? [])
        .filter(shipper => touchesLots(shipper.lot_ids, ownLotIds))
        .map(shipper => ({
          ...shipper,
          lot_ids: shipper.lot_ids.filter(lotId => ownLotIds.has(lotId)),
        })),
    },
  };
};
