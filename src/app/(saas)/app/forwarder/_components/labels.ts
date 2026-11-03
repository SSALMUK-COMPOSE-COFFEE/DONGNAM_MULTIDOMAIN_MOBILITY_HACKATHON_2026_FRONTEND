import type { ForwarderOrderT, ForwarderPlanItemT } from '@/types/saas-forwarder';

export const PLAN_STATUS_LABEL: Record<ForwarderPlanItemT['status'], string> = {
  committed: '확정',
  pending_confirmation: '변경 확인 중',
};

export const ORDER_STATUS_LABEL: Record<ForwarderOrderT['status'], string> = {
  proposed: '화주 확인 대기',
  shipper_confirmed: '내 확정 대기',
  forwarder_confirmed: '확정 완료',
  executed: '실행 완료',
  rejected: '거절됨',
  expired: '기한 만료',
};

export const OPEN_ORDER_STATUSES: readonly ForwarderOrderT['status'][] = [
  'proposed',
  'shipper_confirmed',
];

export const ORDER_PRIORITY: Record<ForwarderOrderT['status'], number> = {
  shipper_confirmed: 0,
  proposed: 1,
  forwarder_confirmed: 2,
  executed: 3,
  rejected: 4,
  expired: 5,
};

export const latestOrder = (orders: readonly ForwarderOrderT[] | undefined) =>
  orders && orders.length > 0 ? orders[orders.length - 1] : null;

export const isAwaitingForwarder = (order: ForwarderOrderT | null) =>
  order?.status === 'shipper_confirmed';
