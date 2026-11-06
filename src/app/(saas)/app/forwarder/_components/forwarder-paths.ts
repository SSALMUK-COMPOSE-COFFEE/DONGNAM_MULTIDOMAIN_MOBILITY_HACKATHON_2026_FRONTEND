const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const text = search.toString();

  return text ? `?${text}` : '';
};

export const FORWARDER_PATHS = {
  HOME: '/app/forwarder',
  CONTAINERS: '/app/forwarder/containers',
  VOYAGES: '/app/forwarder/voyages',
  POOL: '/app/forwarder/lots',
  PLAN: (planId: string) => `/app/forwarder/plans/detail${query({ plan_id: planId })}`,
  ORDERS: '/app/forwarder/orders',
  COLDCHAIN: (planId?: string, containerId?: string) =>
    `/app/forwarder/coldchain${query({ plan_id: planId, container_id: containerId })}`,
} as const;
