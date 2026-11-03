'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useCallback } from 'react';

import { getActiveOrgId, useActiveOrgStore } from '@/apis/saas/active-org';
import { saasApi } from '@/apis/saas/client';
import { orgKeys } from '@/apis/saas/keys';
import { saasRetry } from '@/apis/saas/retry';
import { SAAS_ENDPOINTS } from '@/consts/api-saas';
import type { DemoLoginRequest, LoginRequest, Me, OrgType, SignupRequest } from '@/types/saas';

export const getMe = async () => {
  try {
    const { data } = await saasApi.get<Me>(SAAS_ENDPOINTS.ME);

    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403 && getActiveOrgId()) {
      useActiveOrgStore.getState().clearOrgId();
      const { data } = await saasApi.get<Me>(SAAS_ENDPOINTS.ME);

      return data;
    }

    throw error;
  }
};

export const postLogin = async (request: LoginRequest) => {
  const { data } = await saasApi.post<Me>(SAAS_ENDPOINTS.AUTH_LOGIN, request);

  return data;
};

export const postDemoLogin = async (request: DemoLoginRequest) => {
  const { data } = await saasApi.post<Me>(SAAS_ENDPOINTS.AUTH_DEMO_LOGIN, request);

  return data;
};

export const postSignup = async (request: SignupRequest) => {
  const { data } = await saasApi.post<Me>(SAAS_ENDPOINTS.AUTH_SIGNUP, request);

  return data;
};

export const postLogout = async () => {
  await saasApi.post(SAAS_ENDPOINTS.AUTH_LOGOUT);
};

export const meQueryOptions = () =>
  queryOptions({
    queryKey: orgKeys.me,
    queryFn: getMe,
    retry: saasRetry,
    staleTime: 5 * 60 * 1000,
  });

export const useMe = () => {
  useActiveOrgStore(state => state.orgId);

  return useQuery(meQueryOptions());
};

const useStartSession = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (me: Me) => {
      useActiveOrgStore.getState().clearOrgId();
      queryClient.removeQueries({ queryKey: orgKeys.all });
      queryClient.setQueryData(orgKeys.me, me);
    },
    [queryClient]
  );
};

export const useLogin = () => {
  const startSession = useStartSession();

  return useMutation({ mutationFn: postLogin, onSuccess: startSession });
};

export const useDemoLogin = () => {
  const startSession = useStartSession();

  return useMutation({
    mutationFn: (request: OrgType | DemoLoginRequest) =>
      postDemoLogin(typeof request === 'string' ? { org_type: request } : request),
    onSuccess: startSession,
  });
};

export const useSignup = () => {
  const startSession = useStartSession();

  return useMutation({ mutationFn: postSignup, onSuccess: startSession });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postLogout,
    onSettled: () => {
      useActiveOrgStore.getState().clearOrgId();
      queryClient.removeQueries({ queryKey: orgKeys.all });
    },
  });
};

export const useSwitchOrg = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (orgId: string) => {
      if (getActiveOrgId() === orgId) return;

      useActiveOrgStore.getState().setOrgId(orgId);
      queryClient.removeQueries({ queryKey: orgKeys.all });
    },
    [queryClient]
  );
};
