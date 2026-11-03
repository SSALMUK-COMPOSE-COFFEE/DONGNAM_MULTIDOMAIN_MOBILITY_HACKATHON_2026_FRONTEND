export const SHIPPER_PATHS = {
  HOME: '/app/shipper',
  LOTS: '/app/shipper/lots',
  PLANS: '/app/shipper/plans',
  PLAN: (planId: string) => `/app/shipper/plans/detail?plan_id=${encodeURIComponent(planId)}`,
  REQUESTS: '/app/shipper/requests',
  SETTLEMENTS: '/app/shipper/settlements',
  ONBOARDING: '/app/shipper/onboarding',
} as const;
