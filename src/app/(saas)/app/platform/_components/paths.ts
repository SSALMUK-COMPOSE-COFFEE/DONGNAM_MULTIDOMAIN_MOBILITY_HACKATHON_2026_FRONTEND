import { SAAS_ROUTES } from '@/consts/route-saas';

const HOME = SAAS_ROUTES.platform.home;

export const PLAN_DETAIL_QUERY = 'plan';

export const PLATFORM_PATHS = {
  HOME,
  PLANS: `${HOME}/plans`,
  PLAN: (planId: string) =>
    `${HOME}/plans/detail?${PLAN_DETAIL_QUERY}=${encodeURIComponent(planId)}`,
  COLDCHAIN: `${HOME}/coldchain`,
  COLDCHAIN_OF: (planId: string) => `${HOME}/coldchain?plan=${encodeURIComponent(planId)}`,
  DEVICES: `${HOME}/devices`,
  SETTLEMENTS: `${HOME}/settlements`,
} as const;
