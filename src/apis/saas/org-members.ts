'use client';

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useActiveOrgStore } from '@/apis/saas/active-org';
import { useMe } from '@/apis/saas/auth';
import { saasApi } from '@/apis/saas/client';
import { toastSaasError } from '@/apis/saas/errors';
import { orgKeys } from '@/apis/saas/keys';
import { saasRetry } from '@/apis/saas/retry';
import { broadcastSessionChange } from '@/apis/saas/session-sync';
import type {
  Invitation,
  InvitationAccept,
  InvitationCreate,
  InvitationCreated,
  Me,
  OrgMember,
} from '@/types/saas';

export const ORG_MEMBER_ENDPOINTS = {
  MEMBERS: '/saas/org/members',
  INVITATIONS: '/saas/org/invitations',
  INVITATION: (invitationId: string) => `/saas/org/invitations/${encodeURIComponent(invitationId)}`,
  ACCEPT: '/saas/invitations/accept',
} as const;

const ADMIN_ROLE = 'admin';

export const orgMemberKeys = {
  members: (orgId: string) => orgKeys.list(orgId, 'members'),
  invitations: (orgId: string) => orgKeys.list(orgId, 'invitations'),
};

export const getOrgMembers = async () => {
  const { data } = await saasApi.get<OrgMember[]>(ORG_MEMBER_ENDPOINTS.MEMBERS);

  return data;
};

export const getOrgInvitations = async () => {
  const { data } = await saasApi.get<Invitation[]>(ORG_MEMBER_ENDPOINTS.INVITATIONS);

  return data;
};

export const postOrgInvitation = async (request: InvitationCreate) => {
  const { data } = await saasApi.post<InvitationCreated>(ORG_MEMBER_ENDPOINTS.INVITATIONS, request);

  return data;
};

export const deleteOrgInvitation = async (invitationId: string) => {
  await saasApi.delete(ORG_MEMBER_ENDPOINTS.INVITATION(invitationId));
};

export const postAcceptInvitation = async (request: InvitationAccept) => {
  const { data } = await saasApi.post<Me>(ORG_MEMBER_ENDPOINTS.ACCEPT, request);

  return data;
};

export const orgMembersQueryOptions = (orgId: string) =>
  queryOptions({
    queryKey: orgMemberKeys.members(orgId),
    queryFn: getOrgMembers,
    retry: saasRetry,
    enabled: !!orgId,
  });

export const orgInvitationsQueryOptions = (orgId: string, isAdmin: boolean) =>
  queryOptions({
    queryKey: orgMemberKeys.invitations(orgId),
    queryFn: getOrgInvitations,
    retry: saasRetry,
    enabled: !!orgId && isAdmin,
  });

export const useOrgId = () => useMe().data?.active_org.org_id ?? '';

export const useIsOrgAdmin = () => useMe().data?.active_org.role === ADMIN_ROLE;

export const useCanInvite = () => {
  const activeOrg = useMe().data?.active_org;

  return !!activeOrg && activeOrg.role === ADMIN_ROLE && !activeOrg.sandbox;
};

export const useOrgMembers = () => useQuery(orgMembersQueryOptions(useOrgId()));

export const useOrgInvitations = () =>
  useQuery(orgInvitationsQueryOptions(useOrgId(), useIsOrgAdmin()));

export const useCreateOrgInvitation = () => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: InvitationCreate = { role: 'member' }) => postOrgInvitation(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orgMemberKeys.invitations(orgId) }),
    onError: toastSaasError('초대 코드를 만들지 못했습니다.'),
  });
};

export const useRevokeOrgInvitation = () => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOrgInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgMemberKeys.invitations(orgId) });
      toast.success('초대 코드를 취소했습니다.');
    },
    onError: toastSaasError('초대 코드를 취소하지 못했습니다.'),
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postAcceptInvitation,
    onSuccess: me => {
      useActiveOrgStore.getState().setOrgId(me.active_org.org_id);
      queryClient.removeQueries({ queryKey: orgKeys.all });
      queryClient.setQueryData(orgKeys.me, me);
      broadcastSessionChange('switch');
      toast.success(`${me.active_org.org_name}에 합류했습니다.`);
    },
    onError: toastSaasError('초대 코드를 사용하지 못했습니다.'),
  });
};
