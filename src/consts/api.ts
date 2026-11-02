export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://freshswitch.ssalhub.xyz';

export const IS_API_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

export const ENDPOINTS = {
  PLANS: '/api/plans',
  PLAN: (planId: string) => `/api/plans/${planId}`,

  COLDCHAIN_BINDINGS: '/api/coldchain/bindings',
  COLDCHAIN_SIMULATE: '/api/coldchain/simulate',
  COLDCHAIN_CONTAINER: (containerId: string) => `/api/coldchain/containers/${containerId}`,
  COLDCHAIN_ALERTS_STREAM: '/api/coldchain/alerts/stream',
} as const;
