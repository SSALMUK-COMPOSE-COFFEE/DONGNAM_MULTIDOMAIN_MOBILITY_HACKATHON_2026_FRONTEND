import type {
  ExecutionOrderT,
  IntakePreviewT,
  IntakeRequestT,
  PlanSessionT,
  ScenarioT,
  SchemaT,
} from '@/types/api';

export type ShipperCatalogT = ScenarioT;

export type ShipperLotStatusT = 'registered' | 'planned' | 'shipped' | 'cancelled';

export type ShipperLotT = {
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
  status: ShipperLotStatusT;
  created_at: string;
  updated_at: string;
};

export type ShipperLotListParamsT = {
  status?: ShipperLotStatusT;
  ready_from?: string;
  ready_to?: string;
  limit?: number;
  offset?: number;
};

export type ShipperLotCreateT = IntakeRequestT;
export type ShipperLotPreviewT = IntakePreviewT;

export type ShipperLotPatchT = Partial<{
  product: string;
  destination: string;
  pallets: number;
  ready_date: string;
  sell_by_date: string;
  sell_window: 'normal' | 'short';
  status: Extract<ShipperLotStatusT, 'registered' | 'cancelled'>;
}>;

export type ShipperPlanItemT = {
  plan_id: string;
  created_at: string;
  status: PlanSessionT['status'];
  vessel: string | null;
  departure: string | null;
  my_lot_ids: string[];
  my_pallets: number;
  total_pallets: number;
};

export type ShipperPlanSessionT = PlanSessionT;

export type ShipperOrderT = ExecutionOrderT;
export type ShipperRequestT = SchemaT<'ExternalRequest'>;

export type ShipperRequestAnswerT = {
  accepted: boolean;
  note?: string | null;
};

export type ShipperOrderDecisionT = {
  accept: boolean;
  note?: string | null;
  shipper_id?: string | null;
};

export type ShipperSettlementT = SchemaT<'QualitySettlement'> & {
  plan_id: string;
  version: number;
  vessel: string | null;
  departure: string | null;
};
