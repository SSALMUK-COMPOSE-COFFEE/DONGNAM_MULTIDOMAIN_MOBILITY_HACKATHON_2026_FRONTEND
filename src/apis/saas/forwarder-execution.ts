'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { forwarderKeys, useForwarderOrgId } from '@/apis/saas/forwarder';
import { saasRetry } from '@/apis/saas/retry';
import type {
  ForwarderContainerExecutionT,
  ForwarderExecutionCardT,
  ForwarderExecutionNumbersInputT,
} from '@/types/saas-forwarder';

const segment = encodeURIComponent;

export const FORWARDER_EXECUTION_ENDPOINTS = {
  EXECUTION_CARD: (planId: string) => `/saas/forwarder/plans/${segment(planId)}/execution-card`,
  EXECUTION_NUMBERS: (planId: string, containerId: string) =>
    `/saas/forwarder/plans/${segment(planId)}/execution-card/containers/${segment(containerId)}`,
} as const;

export const forwarderExecutionKeys = {
  card: (orgId: string, planId: string) =>
    [...forwarderKeys.plan(orgId, planId), 'execution-card'] as const,
};

export type SaveExecutionNumbersInputT = ForwarderExecutionNumbersInputT & {
  containerId: string;
};

export const getForwarderExecutionCard = async (planId: string) => {
  const { data } = await saasApi.get<ForwarderExecutionCardT>(
    FORWARDER_EXECUTION_ENDPOINTS.EXECUTION_CARD(planId)
  );

  return data;
};

export const putExecutionNumbers = async (
  planId: string,
  containerId: string,
  numbers: ForwarderExecutionNumbersInputT
) => {
  const { data } = await saasApi.put<ForwarderContainerExecutionT>(
    FORWARDER_EXECUTION_ENDPOINTS.EXECUTION_NUMBERS(planId, containerId),
    numbers
  );

  return data;
};

export const forwarderExecutionCardQueryOptions = (orgId: string, planId: string) =>
  queryOptions({
    queryKey: forwarderExecutionKeys.card(orgId, planId),
    queryFn: () => getForwarderExecutionCard(planId),
    retry: saasRetry,
    enabled: !!orgId && !!planId,
  });

export const useForwarderExecutionCard = (planId: string) =>
  useQuery(forwarderExecutionCardQueryOptions(useForwarderOrgId(), planId));

const withContainer = (saved: ForwarderContainerExecutionT) => (card?: ForwarderExecutionCardT) => {
  if (!card) return card;

  const containers = card.containers.map(item =>
    item.container_id === saved.container_id ? saved : item
  );

  return { ...card, containers, mock: containers.some(item => item.mock) };
};

export const useSaveExecutionNumbers = (planId: string) => {
  const orgId = useForwarderOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ containerId, ...numbers }: SaveExecutionNumbersInputT) =>
      putExecutionNumbers(planId, containerId, numbers),
    onSuccess: saved => {
      queryClient.setQueryData(forwarderExecutionKeys.card(orgId, planId), withContainer(saved));
      queryClient.invalidateQueries({ queryKey: forwarderExecutionKeys.card(orgId, planId) });
      queryClient.invalidateQueries({ queryKey: forwarderKeys.plan(orgId, planId), exact: true });
      toast.success(`${saved.container_id} 실행 번호를 저장했습니다.`);
    },
    onError: toastSaasError('실행 번호를 저장하지 못했습니다.'),
  });
};
