export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? 'ws://localhost:8000';

export const IS_API_MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

/**
 * NOTE: 엔드포인트는 백엔드와 확정 전 초안이다. 확정되면 docs/api.md 와 함께 갱신한다.
 */
export const ENDPOINTS = {
  PLAN: (planId: string) => `/plans/${planId}`,
  SENSOR_WS: (containerId: string) => `/ws/sensor/${containerId}`,
} as const;
