import { SAAS_ROUTES } from '@/consts/route-saas';

const HOME = SAAS_ROUTES.platform.home;

export const PLAN_QUERY = 'plan_id';
const LEGACY_PLAN_QUERY = 'plan';

export const readPlanQuery = (params: Pick<URLSearchParams, 'get'>) =>
  params.get(PLAN_QUERY) ?? params.get(LEGACY_PLAN_QUERY);

export const withPlanQuery = (params: URLSearchParams, planId: string) => {
  const next = new URLSearchParams(params.toString());
  next.delete(LEGACY_PLAN_QUERY);
  next.set(PLAN_QUERY, planId);

  return next;
};

export const PLATFORM_PATHS = {
  HOME,
  PLANS: `${HOME}/plans`,
  PLAN: (planId: string) => `${HOME}/plans/detail?${PLAN_QUERY}=${encodeURIComponent(planId)}`,
  COLDCHAIN: `${HOME}/coldchain`,
  COLDCHAIN_OF: (planId: string) => `${HOME}/coldchain?${PLAN_QUERY}=${encodeURIComponent(planId)}`,
  DEVICES: `${HOME}/devices`,
  SETTLEMENTS: `${HOME}/settlements`,
} as const;
