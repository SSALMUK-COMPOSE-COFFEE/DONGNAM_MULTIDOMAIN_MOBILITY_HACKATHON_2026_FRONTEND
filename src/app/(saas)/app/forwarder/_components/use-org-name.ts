'use client';

import { useMe } from '@/apis/saas/auth';

export const useForwarderOrgName = () => useMe().data?.active_org.org_name ?? '';
