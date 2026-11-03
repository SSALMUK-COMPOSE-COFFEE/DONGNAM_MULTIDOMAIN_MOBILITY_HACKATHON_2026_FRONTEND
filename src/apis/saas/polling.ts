export const OPEN_ORDER_POLLING_MS = 10_000;
export const SHIPPER_PLANS_POLLING_MS = 60_000;

export const OPEN_ORDER_STATUSES: ReadonlySet<string> = new Set([
  'proposed',
  'shipper_confirmed',
  'forwarder_confirmed',
]);

type OrderStatusT = { status: string };

export const capOf = (rows: readonly unknown[] | null, limit: number) => ({
  limit,
  isCapped: !!rows && rows.length >= limit,
});

export const hasOpenOrder = (orders: readonly OrderStatusT[] | null = null) =>
  !!orders?.some(order => OPEN_ORDER_STATUSES.has(order.status));

export const openOrdersRefetchInterval = <TOrderT extends OrderStatusT>(query: {
  state: { data?: readonly TOrderT[] };
}) => (hasOpenOrder(query.state.data ?? null) ? OPEN_ORDER_POLLING_MS : false);
