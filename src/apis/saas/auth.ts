'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useCallback, useEffect } from 'react';

import { getActiveOrgId, useActiveOrgStore } from '@/apis/saas/active-org';
import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { orgKeys } from '@/apis/saas/keys';
import { saasRetry } from '@/apis/saas/retry';
import { broadcastSessionChange, subscribeSessionChange } from '@/apis/saas/session-sync';
import { useDemoOrgStore } from '@/app/(saas)/app/_components/demo-org-store';
import { SAAS_ENDPOINTS } from '@/consts/api-saas';
import type {
  ActiveOrgRequest,
  DemoLoginRequest,
  LoginRequest,
  Me,
  OrgType,
  SignupRequest,
} from '@/types/saas';

export const pinActiveOrg = (me: Me) => {
  const orgId = me.active_org.org_id;

  if (getActiveOrgId() !== orgId) useActiveOrgStore.getState().setOrgId(orgId);

  return me;
};

export const getMe = async () => {
  try {
    const { data } = await saasApi.get<Me>(SAAS_ENDPOINTS.ME);

    return pinActiveOrg(data);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403 && getActiveOrgId()) {
      useActiveOrgStore.getState().clearOrgId();
      const { data } = await saasApi.get<Me>(SAAS_ENDPOINTS.ME);

      return pinActiveOrg(data);
    }

    throw error;
  }
};

export const putActiveOrg = async (orgId: string) => {
  const request: ActiveOrgRequest = { org_id: orgId };
  const { data } = await saasApi.put<Me>(SAAS_ENDPOINTS.AUTH_ACTIVE_ORG, request);

  return data;
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

export const useIsSandbox = () => useMe().data?.active_org.sandbox ?? false;

const useStartSession = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (me: Me) => {
      pinActiveOrg(me);
      queryClient.removeQueries({ queryKey: orgKeys.all });
      queryClient.setQueryData(orgKeys.me, me);
      broadcastSessionChange('login');
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
    onSuccess: (me: Me) => {
      useDemoOrgStore.getState().remember(me.active_org.org_type, me.active_org.org_id);
      startSession(me);
    },
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
    onMutate: () => {
      useActiveOrgStore.getState().clearOrgId();
    },
    onSettled: () => {
      queryClient.removeQueries({ queryKey: orgKeys.all });
      broadcastSessionChange('logout');
    },
  });
};

const isMeQuery = (queryKey: readonly unknown[]) =>
  queryKey.length === orgKeys.me.length && queryKey.every((part, i) => part === orgKeys.me[i]);

export const useSessionSync = () => {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      subscribeSessionChange(async () => {
        const activeOrgOf = () =>
          queryClient.getQueryData<Me>(orgKeys.me)?.active_org.org_id ?? null;
        const before = activeOrgOf();

        await queryClient.invalidateQueries({ queryKey: orgKeys.me, exact: true });

        const others = {
          queryKey: orgKeys.all,
          predicate: (query: { queryKey: readonly unknown[] }) => !isMeQuery(query.queryKey),
        };

        if (activeOrgOf() === before) queryClient.invalidateQueries(others);
        else queryClient.removeQueries(others);
      }),
    [queryClient]
  );
};

const toastSwitchOrgError = toastSaasError('조직을 전환하지 못했습니다.');

export const useSwitchOrg = (boundOrgId: string | null = null) => {
  const queryClient = useQueryClient();

  return useCallback(
    async (orgId: string | null = boundOrgId) => {
      if (!orgId || getActiveOrgId() === orgId) return false;

      let me: Me;
      try {
        me = await putActiveOrg(orgId);
      } catch (error) {
        toastSwitchOrgError(error);
        return false;
      }

      pinActiveOrg(me);
      queryClient.removeQueries({ queryKey: orgKeys.all });
      queryClient.setQueryData(orgKeys.me, me);

      return true;
    },
    [queryClient, boundOrgId]
  );
};
