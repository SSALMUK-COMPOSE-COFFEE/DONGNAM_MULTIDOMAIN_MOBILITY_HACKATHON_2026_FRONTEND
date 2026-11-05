'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { orgKeys } from '@/apis/saas/keys';
import { saasRetry } from '@/apis/saas/retry';
import type {
  AcceptRefillInputT,
  ConfirmQuantityInputT,
  DeclineRefillInputT,
  QuantityChangeResultT,
  QuantityDepartureInputT,
  QuantityPolicyInputT,
  QuantityQuoteT,
  QuantityStatementRowT,
  RefillOfferT,
  RefillOverviewT,
  ReservationStateT,
  SubmitQuantityInputT,
  VoyageQuantityStateT,
} from '@/types/saas-quantity';

const segment = encodeURIComponent;
const planPath = (role: 'shipper' | 'forwarder', planId: string) =>
  `/saas/${role}/plans/${segment(planId)}`;
const quantityPath = (planId: string, lotId: string) =>
  `${planPath('shipper', planId)}/lots/${segment(lotId)}/quantity`;
const voyagePath = (planId: string, voyageId: string) =>
  `${planPath('forwarder', planId)}/voyages/${segment(voyageId)}/quantity-policy`;
const offerPath = (offerId: string) => `/saas/shipper/refill-offers/${segment(offerId)}`;

export const quantityKeys = {
  all: (orgId: string) => [...orgKeys.scoped(orgId), 'quantity-reservations'] as const,
};

const useIdentity = (role: 'shipper' | 'forwarder') => {
  const { data: me } = useMe();

  return me?.active_org.org_type === role ? me.active_org.org_id : '';
};

const useInvalidateQuantity = () => {
  const { data: me } = useMe();
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({ queryKey: orgKeys.scoped(me?.active_org.org_id ?? '') });
};

export function useReservationState(planId: string, lotId: string, enabled = true) {
  const orgId = useIdentity('shipper');

  return useQuery({
    queryKey: [...quantityKeys.all(orgId), 'reservation', planId, lotId],
    queryFn: async () => (await saasApi.get<ReservationStateT>(quantityPath(planId, lotId))).data,
    enabled: !!orgId && !!planId && !!lotId && enabled,
    retry: saasRetry,
    refetchInterval: 30_000,
  });
}

export function useShipperQuantityPolicies(planId: string) {
  const orgId = useIdentity('shipper');

  return useQuery({
    queryKey: [...quantityKeys.all(orgId), 'shipper-policies', planId],
    queryFn: async () =>
      (await saasApi.get<VoyageQuantityStateT[]>(`${planPath('shipper', planId)}/quantity-policy`))
        .data,
    enabled: !!orgId && !!planId,
    retry: saasRetry,
    refetchInterval: 30_000,
  });
}

export function useQuantityQuote(
  planId: string,
  lotId: string,
  quantity: number | null,
  enabled = true,
  revision = 0
) {
  const orgId = useIdentity('shipper');

  return useQuery({
    queryKey: [...quantityKeys.all(orgId), 'quote', planId, lotId, quantity, revision],
    queryFn: async () =>
      (await saasApi.post<QuantityQuoteT>(`${quantityPath(planId, lotId)}/quote`, { quantity }))
        .data,
    enabled: !!orgId && !!planId && !!lotId && quantity !== null && enabled,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useSubmitQuantity(planId: string, lotId: string) {
  const invalidate = useInvalidateQuantity();

  return useMutation({
    mutationFn: async (body: SubmitQuantityInputT) =>
      (await saasApi.post<QuantityChangeResultT>(quantityPath(planId, lotId), body)).data,
    retry: false,
    onSuccess: invalidate,
  });
}

export function useConfirmReservedQuantity(planId: string, lotId: string) {
  const invalidate = useInvalidateQuantity();

  return useMutation({
    mutationFn: async (body: ConfirmQuantityInputT) =>
      (await saasApi.post<ReservationStateT>(`${quantityPath(planId, lotId)}/confirm`, body)).data,
    retry: false,
    onSuccess: invalidate,
  });
}

export function useRefillOffers() {
  const orgId = useIdentity('shipper');

  return useQuery({
    queryKey: [...quantityKeys.all(orgId), 'refill-offers'],
    queryFn: async () => (await saasApi.get<RefillOfferT[]>('/saas/shipper/refill-offers')).data,
    enabled: !!orgId,
    retry: saasRetry,
    refetchInterval: 15_000,
  });
}

export function useAcceptRefillOffer(offerId: string) {
  const invalidate = useInvalidateQuantity();

  return useMutation({
    mutationFn: async (body: AcceptRefillInputT) =>
      (await saasApi.post<RefillOfferT>(`${offerPath(offerId)}/accept`, body)).data,
    retry: false,
    onSuccess: invalidate,
  });
}

export function useDeclineRefillOffer(offerId: string) {
  const invalidate = useInvalidateQuantity();

  return useMutation({
    mutationFn: async (body: DeclineRefillInputT) =>
      (await saasApi.post<RefillOfferT>(`${offerPath(offerId)}/decline`, body)).data,
    retry: false,
    onSuccess: invalidate,
  });
}

export function useForwarderQuantityPolicies() {
  const orgId = useIdentity('forwarder');

  return useQuery({
    queryKey: [...quantityKeys.all(orgId), 'forwarder-policies'],
    queryFn: async () =>
      (await saasApi.get<VoyageQuantityStateT[]>('/saas/forwarder/quantity-policies')).data,
    enabled: !!orgId,
    retry: saasRetry,
    refetchInterval: 30_000,
  });
}

export function useForwarderQuantityPolicy(planId: string, voyageId: string) {
  const orgId = useIdentity('forwarder');

  return useQuery({
    queryKey: [...quantityKeys.all(orgId), 'forwarder-policy', planId, voyageId],
    queryFn: async () =>
      (await saasApi.get<VoyageQuantityStateT>(voyagePath(planId, voyageId))).data,
    enabled: !!orgId && !!planId && !!voyageId,
    retry: saasRetry,
  });
}

export function useSaveForwarderQuantityPolicy() {
  const invalidate = useInvalidateQuantity();

  return useMutation({
    mutationFn: async ({
      planId,
      voyageId,
      policy,
    }: {
      planId: string;
      voyageId: string;
      policy: QuantityPolicyInputT;
    }) => (await saasApi.put<VoyageQuantityStateT>(voyagePath(planId, voyageId), policy)).data,
    retry: false,
    onSuccess: invalidate,
  });
}

export function useForwarderRefillState(planId: string) {
  const orgId = useIdentity('forwarder');

  return useQuery({
    queryKey: [...quantityKeys.all(orgId), 'forwarder-refill', planId],
    queryFn: async () =>
      (await saasApi.get<RefillOverviewT>(`${planPath('forwarder', planId)}/refill`)).data,
    enabled: !!orgId && !!planId,
    retry: saasRetry,
    refetchInterval: 15_000,
  });
}

export function useShipperQuantityStatement(planId: string) {
  const orgId = useIdentity('shipper');

  return useQuery({
    queryKey: [...quantityKeys.all(orgId), 'statement', planId],
    queryFn: async () =>
      (
        await saasApi.get<QuantityStatementRowT[]>(
          `${planPath('shipper', planId)}/quantity-statement`
        )
      ).data,
    enabled: !!orgId && !!planId,
    retry: saasRetry,
    refetchInterval: 30_000,
  });
}

export function useShipperQuantityStatements() {
  const orgId = useIdentity('shipper');

  return useQuery({
    queryKey: [...quantityKeys.all(orgId), 'statements'],
    queryFn: async () =>
      (await saasApi.get<QuantityStatementRowT[]>('/saas/shipper/quantity-statements')).data,
    enabled: !!orgId,
    retry: saasRetry,
    refetchInterval: 30_000,
  });
}

export function useConfirmQuantityDeparture() {
  const invalidate = useInvalidateQuantity();

  return useMutation({
    mutationFn: async ({
      planId,
      voyageId,
      ...body
    }: QuantityDepartureInputT & { planId: string; voyageId: string }) =>
      (
        await saasApi.post<QuantityStatementRowT[]>(
          `${planPath('forwarder', planId)}/voyages/${segment(voyageId)}/quantity-departure`,
          body
        )
      ).data,
    retry: false,
    onSuccess: invalidate,
  });
}
