import type { BindingRequestT } from '@/types/api';
import type { SaasQueryT, SaasSchemaT, WithDefaultsT } from '@/types/api-saas';

export type PlatformLotT = SaasSchemaT<'PlatformLot'>;
export type LotStatusT = PlatformLotT['status'];

export type PlatformPlanRequestT = WithDefaultsT<
  SaasSchemaT<'PlatformPlanRequest'>,
  'scenario_id' | 'use_learned_loss' | 'include_registered' | 'auto_accept'
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

export type PlanPreviewT = SaasSchemaT<'PlanPreview'>;

export type PlatformChangeRequestT = SaasSchemaT<'PlatformChangeRequest'>;
export type PlatformChangeRequestListParamsT =
  SaasQueryT<'/test/api/saas/platform/change-requests'>;
export type ChangeRequestReplanT = SaasSchemaT<'ChangeRequestReplan'>;
export type ChangeRequestApplyT = SaasSchemaT<'ChangeRequestApply'>;
export type ChangeRequestAppliedT = SaasSchemaT<'ChangeRequestApplied'>;
export type ChangeRequestRejectT = SaasSchemaT<'ChangeRequestReject'>;

export type ColdchainActionHandlerT = SaasSchemaT<'ActionHandler'>;
export type ColdchainActionUpdateT = SaasSchemaT<'ActionUpdateBody'>;
export type ColdchainResidualRiskT = SaasSchemaT<'ResidualRisk'>;

export type PowerPlanT = SaasSchemaT<'PowerPlan'>;
export type LotPowerPlanT = SaasSchemaT<'LotPowerPlan'>;
export type PowerSegmentT = SaasSchemaT<'PowerSegment'>;
export type GensetCandidateT = SaasSchemaT<'GensetCandidate'>;

export type AssignmentReasonT = SaasSchemaT<'AssignmentReason'>;
export type AssignmentReasonCodeT = AssignmentReasonT['code'];

export type PlatformAlertT = SaasSchemaT<'Alert'>;
export type PlatformColdchainActionT = SaasSchemaT<'ColdchainAction'>;

export type PlatformMetricsT = SaasSchemaT<'PlatformMetrics'>;
export type PlatformMetricsParamsT = SaasQueryT<'/test/api/saas/platform/metrics'>;
export type PlatformMetricT = SaasSchemaT<'Metric'>;
export type PlatformRegionMetricsT = SaasSchemaT<'RegionMetrics'>;
export type PlatformEmissionResultT = SaasSchemaT<'EmissionResult'>;
export type PlatformEmissionLineT = SaasSchemaT<'EmissionLine'>;

export type PlatformBusinessT = SaasSchemaT<'PlatformBusiness'>;
export type PlatformBusinessParamsT = SaasQueryT<'/test/api/saas/platform/business'>;
export type PlatformBusinessLineT = SaasSchemaT<'BusinessLine'>;
export type PlatformPlanEconomicsT = SaasSchemaT<'PlanEconomics'>;

export type BusinessYearsT = SaasSchemaT<'BusinessYears'>;
export type BusinessYearsParamsT = SaasQueryT<'/test/api/saas/platform/business/years'>;
export type BusinessYearLineT = SaasSchemaT<'YearLine'>;
export type BusinessYearRowT = SaasSchemaT<'YearRow'>;
export type BusinessYearVolumeT = SaasSchemaT<'YearVolume'>;
export type BusinessYearSubsidyT = SaasSchemaT<'YearSubsidy'>;
