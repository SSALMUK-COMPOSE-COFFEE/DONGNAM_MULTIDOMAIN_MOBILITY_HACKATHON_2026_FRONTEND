import type { BindingRequestT } from '@/types/api';
import type { SaasSchemaT, WithDefaultsT } from '@/types/api-saas';

export type PlatformLotT = SaasSchemaT<'PlatformLot'>;
export type LotStatusT = PlatformLotT['status'];

export type PlatformPlanRequestT = WithDefaultsT<
  SaasSchemaT<'PlatformPlanRequest'>,
  'scenario_id' | 'use_learned_loss' | 'include_registered'
>;

export type ForwarderRefT = SaasSchemaT<'ForwarderRef'>;

export type PlatformPlanItemT = SaasSchemaT<'PlanListItem'>;

export type PlatformShipperShareT = SaasSchemaT<'PlatformShipperShare'>;

export type PlatformSettlementT = SaasSchemaT<'PlatformSettlement'>;

export type OrgSummaryT = SaasSchemaT<'OrgSummary'>;

export type ForwarderAssignRequestT = SaasSchemaT<'ForwarderAssignRequest'>;

export type ForwarderAssignmentT = SaasSchemaT<'ForwarderAssignment'>;

export type BindingT = SaasSchemaT<'Binding'>;
export type BindingStageT = NonNullable<BindingRequestT['stage']>;

export type DeviceT = SaasSchemaT<'Device'>;

export type RegisteredDeviceT = SaasSchemaT<'RegisteredDevice'>;

export type DeviceRequestT = SaasSchemaT<'DeviceRequest'>;

export type TwinSummaryT = SaasSchemaT<'TwinSummary'>;
