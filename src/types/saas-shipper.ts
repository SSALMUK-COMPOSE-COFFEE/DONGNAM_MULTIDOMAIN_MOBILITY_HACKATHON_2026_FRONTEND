import type { ExecutionOrderT, ScenarioT, SchemaT } from '@/types/api';
import type { SaasPlanSessionT, SaasQueryT, SaasSchemaT, WithDefaultsT } from '@/types/api-saas';

export type ShipperCatalogT = ScenarioT;

export type ShipperLotT = SaasSchemaT<'ShipperLot'>;
export type ShipperLotStatusT = ShipperLotT['status'];
export type ShipperRegisteredLotT = SaasSchemaT<'RegisteredLot'>;
export type ShipperLotWarningsT = NonNullable<ShipperRegisteredLotT['warnings']>;

export type ExpectedLossT = SaasSchemaT<'ExpectedLoss'>;
export type ExpectedLossModeT = ExpectedLossT['mode'];

export type ShipperLotListParamsT = SaasQueryT<'/test/api/saas/shipper/lots'>;

export type ShipperLotCreateT = WithDefaultsT<
  SaasSchemaT<'ShipperLotCreate'>,
  'sell_window' | 'scenario_id' | 'save'
>;
export type ShipperLotPreviewT = SaasSchemaT<'IntakePreview'>;

export type ShipperLotPatchT = SaasSchemaT<'LotPatch'>;

export type ShipperPlanItemT = SaasSchemaT<'ShipperPlanItem'>;

export type ShipperPlanSessionT = SaasPlanSessionT;

export type ShipperOrderT = ExecutionOrderT;
export type ShipperRequestT = SchemaT<'ExternalRequest'>;

export type ShipperRequestAnswerT = SaasSchemaT<'RequestResultBody'>;

export type ShipperOrderDecisionT = SaasSchemaT<'ShipperDecision'>;

export type ShipperSettlementT = SaasSchemaT<'ShipperSettlementRow'>;

export type ShipperProfileViewT = SaasSchemaT<'ShipperProfileView'>;
export type ShipperProfileT = SaasSchemaT<'ShipperProfileOut'>;
export type ShipperProfilePatchT = SaasSchemaT<'ShipperProfilePatch'>;
export type ShipperProductOptionT = SaasSchemaT<'ProductOption'>;

export type PackhouseT = SaasSchemaT<'PackhouseOut'>;
export type PackhouseCreateT = SaasSchemaT<'PackhouseCreate'>;
export type PackhousePatchT = SaasSchemaT<'PackhousePatch'>;

export type SeasonCheckT = SaasSchemaT<'SeasonCheck'>;

export type ChangeRequestCreateT = SaasSchemaT<'ChangeRequestCreate'>;
export type ChangeRequestTypeT = ChangeRequestCreateT['type'];
export type ShipperChangeRequestT = SaasSchemaT<'ShipperChangeRequest'>;
export type ChangeRequestStatusT = ShipperChangeRequestT['status'];
export type CancellationEstimateT = SaasSchemaT<'CancellationEstimate'>;
export type ShipperChangeRequestListParamsT = SaasQueryT<'/test/api/saas/shipper/change-requests'>;

export type ShipperNotificationT = SaasSchemaT<'Notification'>;
export type ShipperNotificationKindT = ShipperNotificationT['kind'];
export type ShipperNotificationListParamsT = SaasQueryT<'/test/api/saas/shipper/notifications'>;

export type SavingsEstimateT = SaasSchemaT<'SavingsEstimate'>;
