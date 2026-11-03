'use client';

import { useShipperOrdersByPlans, useShipperPlans } from '@/apis/saas/shipper';
import type { ShipperOrderT, ShipperPlanItemT, ShipperRequestT } from '@/types/saas-shipper';

const CLOSED_ORDER_STATUSES: readonly ShipperOrderT['status'][] = [
  'executed',
  'rejected',
  'expired',
];

export type ShipperPlanOrdersT = {
  plan: ShipperPlanItemT;
  orders: ShipperOrderT[];
};

export type PendingRequestT = {
  plan: ShipperPlanItemT;
  order: ShipperOrderT;
  request: ShipperRequestT;
};

export const isOrderOpen = (order: ShipperOrderT) => !CLOSED_ORDER_STATUSES.includes(order.status);

export const isRequestAnswerable = (order: ShipperOrderT, request: ShipperRequestT) =>
  request.status === 'pending' && order.status === 'forwarder_confirmed';

export const isRequestAwaitingForwarder = (order: ShipperOrderT, request: ShipperRequestT) =>
  request.status === 'pending' && isOrderOpen(order) && order.status !== 'forwarder_confirmed';

export const pendingConfirmationsOf = (orders: ShipperOrderT[]) =>
  orders.filter(
    order =>
      order.status === 'proposed' &&
      order.shipper_confirmations.some(({ status }) => status === 'pending')
  );

export const pendingRequestsOf = (orders: ShipperOrderT[]) =>
  orders.flatMap(order =>
    order.requests
      .filter(request => isRequestAnswerable(order, request))
      .map(request => ({ order, request }))
  );

export const useShipperTasks = () => {
  const plans = useShipperPlans();
  const planList = plans.data ?? [];
  const ordersQueries = useShipperOrdersByPlans(planList.map(({ plan_id }) => plan_id));

  const byPlan: ShipperPlanOrdersT[] = planList.map((plan, index) => ({
    plan,
    orders: ordersQueries[index]?.data ?? [],
  }));
  const confirmations = byPlan.flatMap(({ plan, orders }) =>
    pendingConfirmationsOf(orders).map(order => ({ plan, order }))
  );
  const requests: PendingRequestT[] = byPlan.flatMap(({ plan, orders }) =>
    pendingRequestsOf(orders).map(item => ({ plan, ...item }))
  );

  return {
    plans,
    byPlan,
    confirmations,
    requests,
    isOrdersLoading: ordersQueries.some(({ isPending }) => isPending),
    isOrdersError: ordersQueries.some(({ isError }) => isError),
    isOrdersFetching: ordersQueries.some(({ isFetching }) => isFetching),
    refetchOrders: () => Promise.all(ordersQueries.map(({ refetch }) => refetch())),
  };
};
