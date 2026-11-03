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

export const CLOSED_ORDER_STATUSES: readonly ForwarderOrderT['status'][] = [
  'forwarder_confirmed',
  'executed',
];

export const REQUEST_KIND_LABEL: Record<ForwarderOrderT['requests'][number]['kind'], string> = {
  booking_amendment: '부킹 변경',
  booking_cancel: '부킹 취소',
  booking_new: '신규 부킹',
  reefer_plug: '리퍼 플러그',
  cy_entry: 'CY 반입',
  air_booking: '항공 예약',
  air_cancel: '항공 취소',
};

export const REQUEST_STATUS_LABEL: Record<
  NonNullable<ForwarderOrderT['requests'][number]['status']>,
  string
> = {
  pending: '회신 대기',
  accepted: '수락',
  declined: '거절',
};

export const SHIPPER_CONFIRM_LABEL: Record<
  ForwarderOrderT['shipper_confirmations'][number]['status'],
  string
> = {
  pending: '확인 대기',
  accepted: '수락함',
  rejected: '거절함',
};

export const planStatusLabel = (status: string) =>
  (PLAN_STATUS_LABEL as Record<string, string | undefined>)[status] ?? status;
