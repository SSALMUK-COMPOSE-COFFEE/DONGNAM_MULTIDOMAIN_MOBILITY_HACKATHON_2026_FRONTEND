import type { AlertT, ExecutionOrderT, PlanSessionT, SchemaT, TwinStateT } from '@/types/api';

export type ForwarderRefT = {
  org_id: string;
  org_name: string;
};

export type ForwarderPlanItemT = {
  plan_id: string;
  created_at: string;
  status: PlanSessionT['status'];
  vessel: string | null;
  departure: string | null;
  shipper_count: number;
  total_pallets: number;
  forwarder: ForwarderRefT | null;
};

export type ForwarderPlanSessionT = PlanSessionT;

export type ForwarderOrderT = ExecutionOrderT;

export type ForwarderDecisionT = {
  accept: boolean;
  note?: string | null;
};

export type ForwarderPlanListParamsT = {
  limit?: number;
  offset?: number;
};

export type ForwarderTwinSummaryT = SchemaT<'TwinSummary'>;
export type ForwarderTwinStateT = TwinStateT;
export type ForwarderAlertT = AlertT;

export type ForwarderStreamStateT = 'connecting' | 'open' | 'retrying';
