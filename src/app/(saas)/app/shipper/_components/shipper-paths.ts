import type { ShipperLotStatusT } from '@/types/saas-shipper';

export const SHIPPER_PATHS = {
  HOME: '/app/shipper',
  LOTS: '/app/shipper/lots',
  PRODUCTS: '/app/shipper/products',
  NEW_LOT: '/app/shipper/lots?new=1',
  LOT_LIST: (status: ShipperLotStatusT | 'all' = 'all') =>
    `/app/shipper/lots?view=list&status=${status}`,
  PLANS: '/app/shipper/plans',
  PLAN: (planId: string) => `/app/shipper/plans/detail?plan_id=${encodeURIComponent(planId)}`,
  REQUESTS: '/app/shipper/requests',
  SETTLEMENTS: '/app/shipper/settlements',
  ADD_PACKHOUSE: '/app/shipper/onboarding/new',
  ONBOARDING: '/app/shipper/onboarding',
} as const;
