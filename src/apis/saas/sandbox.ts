'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { orgKeys } from '@/apis/saas/keys';
import type { SandboxResetT } from '@/types/saas-sandbox';

export const SANDBOX_ENDPOINTS = {
  RESET: '/saas/sandbox/reset',
} as const;

const SANDBOX_RESET_TIMEOUT_MS = 30_000;

export const postSandboxReset = async () => {
  const { data } = await saasApi.post<SandboxResetT>(SANDBOX_ENDPOINTS.RESET, null, {
    timeout: SANDBOX_RESET_TIMEOUT_MS,
  });

  return data;
};

export const useCanResetSandbox = () => {
  const activeOrg = useMe().data?.active_org;

  return !!activeOrg && activeOrg.sandbox && activeOrg.org_type === 'platform';
};

export const useSandboxReset = () => {
  const queryClient = useQueryClient();
  const orgId = useMe().data?.active_org.org_id ?? '';

  return useMutation({
    mutationFn: postSandboxReset,
    onSuccess: ({ orgs }) => {
      queryClient.resetQueries({ queryKey: orgKeys.scoped(orgId) });
      queryClient.invalidateQueries({
        queryKey: orgKeys.all,
        predicate: ({ queryKey }) => queryKey[1] !== orgId,
      });
      toast.success(`데모 세계 ${orgs}개 조직을 처음 상태로 되돌렸습니다.`);
    },
    onError: toastSaasError('데모 세계를 초기화하지 못했습니다.'),
  });
};
