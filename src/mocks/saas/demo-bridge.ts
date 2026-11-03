import { getResponse } from 'msw';

import { handlers as demoHandlers } from '@/mocks/handlers';
import type { ExecutionOrderT, PlanSessionT } from '@/types/api';

const BRIDGE_ORIGIN = 'http://saas-mock.local';

const callDemo = async <T>(method: string, path: string, body: unknown = null) => {
  const request = new Request(`${BRIDGE_ORIGIN}${path}`, {
    method,
    headers: body === null ? {} : { 'content-type': 'application/json' },
    body: body === null ? null : JSON.stringify(body),
  });
  const response = await getResponse(demoHandlers, request);
  if (!response) throw new Error(`no demo mock for ${method} ${path}`);

  return (await response.json()) as T;
};

export const demoPlan = (planId: string) =>
  callDemo<PlanSessionT>('GET', `/api/plans/${encodeURIComponent(planId)}`);

export const demoCreatePlan = () => callDemo<PlanSessionT>('POST', '/api/plans', {});

export const demoOrders = (planId: string) =>
  callDemo<ExecutionOrderT[]>('GET', `/api/plans/${encodeURIComponent(planId)}/orders`);

export const demoConfirm = (
  planId: string,
  orderId: string,
  body: { actor: 'shipper' | 'forwarder'; accept: boolean; note?: string | null }
) =>
  callDemo<ExecutionOrderT>(
    'POST',
    `/api/plans/${encodeURIComponent(planId)}/orders/${encodeURIComponent(orderId)}/confirm`,
    body
  );
