'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { orgTypeOfPath, roleHome, safeNextPath } from '@/consts/route-saas';
import type { Me } from '@/types/saas';

export const useEnterApp = () => {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('next'));

  return useCallback(
    (me: Me) => {
      const orgType = me.active_org.org_type;
      const nextType = next ? orgTypeOfPath(next) : null;

      router.replace(
        next && (nextType === null || nextType === orgType) ? next : roleHome(orgType)
      );
    },
    [next, router]
  );
};
