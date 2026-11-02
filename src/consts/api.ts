export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://freshswitch.ssalhub.xyz';

export const IS_API_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

export const ENDPOINTS = {
  SCENARIO: (scenarioId: string) => `/api/scenarios/${scenarioId}`,
  INTAKE_LOTS: '/api/intake/lots',

  PLANS: '/api/plans',
  PLAN: (planId: string) => `/api/plans/${planId}`,
  PLAN_EVENTS: (planId: string) => `/api/plans/${planId}/events`,
  PLAN_APPLY: (planId: string) => `/api/plans/${planId}/apply`,
  PLAN_ORDERS: (planId: string) => `/api/plans/${planId}/orders`,
  PLAN_ORDER_CONFIRM: (planId: string, orderId: string) =>
    `/api/plans/${planId}/orders/${orderId}/confirm`,

  DEMO_RESET: '/api/demo/reset',

  COLDCHAIN_BINDINGS: '/api/coldchain/bindings',
  COLDCHAIN_SIMULATE: '/api/coldchain/simulate',
  COLDCHAIN_CONTAINER: (containerId: string) => `/api/coldchain/containers/${containerId}`,
  COLDCHAIN_ALERTS_STREAM: '/api/coldchain/alerts/stream',
} as const;
