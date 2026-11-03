import type { AlertT, PlanSessionT, TwinStateT } from '@/types/api';
import type { SaasQueryT, SaasSchemaT } from '@/types/api-saas';

export type ForwarderRefT = SaasSchemaT<'ForwarderRef'>;

export type ForwarderPlanItemT = SaasSchemaT<'PlanListItem'>;

export type ForwarderPlanSessionT = PlanSessionT;

export type ForwarderOrderT = SaasSchemaT<'ForwarderOrder'>;

export type ForwarderDecisionT = SaasSchemaT<'ForwarderDecision'>;

export type ForwarderRequestAnswerT = SaasSchemaT<'RequestResultBody'>;

export type ForwarderPlanListParamsT = SaasQueryT<'/test/api/saas/forwarder/plans'>;

export type ForwarderTwinSummaryT = SaasSchemaT<'TwinSummary'>;
export type ForwarderTwinStateT = TwinStateT;
export type ForwarderAlertT = AlertT;

export type ForwarderStreamStateT = 'connecting' | 'open' | 'retrying';
