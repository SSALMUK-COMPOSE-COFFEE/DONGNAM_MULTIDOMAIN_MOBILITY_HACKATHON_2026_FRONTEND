'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { saasApi } from '@/apis/saas/client';
import { orgKeys } from '@/apis/saas/keys';
import { broadcastSessionChange } from '@/apis/saas/session-sync';
import { SAAS_ENDPOINTS, SAAS_HEADERS } from '@/consts/api-saas';
import type { SaasSchemaT } from '@/types/api-saas';
import type { Me, MeUser } from '@/types/saas';

export const useUpdateCompany = (orgId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: Pick<MeUser, 'name'>) => {
      const { data } = await saasApi.patch<SaasSchemaT<'OrgSummary'>>(
        SAAS_ENDPOINTS.COMPANY,
        request,
        {
          headers: { [SAAS_HEADERS.ORG_ID]: orgId },
        }
      );

      return data;
    },
    onSuccess: company => {
      queryClient.setQueryData<Me>(orgKeys.me, me =>
        me
          ? {
              ...me,
              active_org:
                me.active_org.org_id === company.org_id
                  ? { ...me.active_org, org_name: company.org_name }
                  : me.active_org,
              memberships: me.memberships.map(membership =>
                membership.org_id === company.org_id
                  ? { ...membership, org_name: company.org_name }
                  : membership
              ),
            }
          : me
      );
      queryClient.invalidateQueries({ queryKey: orgKeys.all });
      broadcastSessionChange('switch');
    },
  });
};
