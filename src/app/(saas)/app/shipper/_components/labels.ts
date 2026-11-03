import type { ShipperLotStatusT, ShipperPlanItemT, ShipperRequestT } from '@/types/saas-shipper';

export const LOT_STATUS_LABEL: Record<ShipperLotStatusT, string> = {
  registered: '등록됨',
  planned: '계획 포함',
  shipped: '출하됨',
  cancelled: '취소됨',
};

export const LOCKED_LOT_STATUSES: readonly ShipperLotStatusT[] = ['planned', 'shipped'];

export const PLAN_STATUS_LABEL: Record<ShipperPlanItemT['status'], string> = {
  committed: '확정',
  pending_confirmation: '확인 대기',
};

export const REQUEST_KIND_LABEL: Record<ShipperRequestT['kind'], string> = {
  booking_amendment: '배 예약 변경',
  booking_cancel: '배 예약 취소',
  booking_new: '새 배 예약',
  reefer_plug: '냉장 전원 연결',
  cy_entry: '항구 반입',
  air_booking: '항공 예약',
  air_cancel: '항공 취소',
};

export const REQUEST_STATUS_LABEL: Record<ShipperRequestT['status'], string> = {
  pending: '응답 대기',
  accepted: '수락함',
  declined: '거절함',
};

export const SELL_WINDOW_LABEL = {
  normal: '일반',
  short: '짧음',
} as const;
