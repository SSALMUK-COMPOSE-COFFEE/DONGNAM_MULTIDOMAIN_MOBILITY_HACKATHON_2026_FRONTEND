import type { BindingRequestT, SchemaT } from '@/types/api';
import type { OrgType } from '@/types/saas';

export type LotStatusT = 'registered' | 'planned' | 'shipped' | 'cancelled';

export type PlatformLotT = {
  id: string;
  scenario_id: string;
  shipper_id: string;
  product_id: string;
  pallets: number;
  ready_date: string;
  destination: string;
  sell_by_date: string;
  sell_window: 'normal' | 'short';
  packhouse: string | null;
  source: string;
  status: LotStatusT;
  created_at: string;
  updated_at: string;
  shipper_org_id: string;
  shipper_org_name: string;
};

export type PlatformPlanRequestT = {
  lot_ids: string[];
  scenario_id?: string;
  use_learned_loss?: boolean;
};

export type ForwarderRefT = {
  org_id: string;
  org_name: string;
};

export type PlatformPlanItemT = {
  plan_id: string;
  created_at: string;
  status: string;
  vessel: string | null;
  departure: string | null;
  shipper_count: number;
  total_pallets: number;
  forwarder: ForwarderRefT | null;
};

export type PlatformShipperShareT = {
  shipper_id: string;
  shipper_org_name: string | null;
  saving_krw: number;
  fee_krw: number;
};

export type PlatformSettlementT = {
  plan_id: string;
  vessel: string | null;
  departure: string | null;
  total_saving_krw: number;
  platform_fee_krw: number;
  shippers: PlatformShipperShareT[];
};

export type OrgSummaryT = {
  org_id: string;
  org_type: OrgType;
  org_name: string;
};

export type ForwarderAssignRequestT = {
  forwarder_org_id: string;
};

export type ForwarderAssignmentT = {
  plan_id: string;
  forwarder: ForwarderRefT;
};

export type BindingT = SchemaT<'Binding'>;
export type BindingStageT = NonNullable<BindingRequestT['stage']>;

export type DeviceT = {
  device_id: string;
  name: string | null;
  created_at: string;
  last_seen_at: string | null;
  binding: BindingT | null;
};

export type RegisteredDeviceT = DeviceT & {
  device_token: string;
};

export type DeviceRequestT = {
  device_id: string;
  name?: string | null;
};

export type TwinSummaryT = SchemaT<'TwinSummary'>;
