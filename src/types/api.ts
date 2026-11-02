import type { components } from '@/types/openapi';

/**
 * 백엔드 OpenAPI 스키마 타입.
 * openapi.d.ts 는 `pnpm gen:api` 로 생성하므로 직접 고치지 않는다.
 */
export type SchemaT<K extends keyof components['schemas']> = components['schemas'][K];

export type PlanSessionT = SchemaT<'PlanSession'>;
export type CreatePlanRequestT = SchemaT<'CreatePlanRequest'>;
export type ContainerLoadT = SchemaT<'ContainerLoad'>;
export type ScenarioT = SchemaT<'Scenario'>;
export type PlanT = SchemaT<'Plan'>;
export type ContainerSettlementT = SchemaT<'ContainerSettlement'>;
export type TariffSheetT = SchemaT<'TariffSheet'>;
export type IntakeRequestT = SchemaT<'IntakeRequest'>;
export type IntakePreviewT = SchemaT<'IntakePreview'>;

export type PlanEventT = SchemaT<'EventRequest'>['event'];
export type ReplanResponseT = SchemaT<'ReplanResponse'>;
export type AlternativeT = SchemaT<'Alternative'>;
export type AlternativeIdT = AlternativeT['id'];
export type ExecutionOrderT = SchemaT<'ExecutionOrder'>;
export type ConfirmRequestT = SchemaT<'ConfirmRequest'>;

export type FuelShockRequestT = SchemaT<'FuelShockRequest'>;
export type FuelShockResultT = SchemaT<'FuelShockResult'>;
export type FuelShockCaseT = SchemaT<'FuelShockCase'>;
export type ModeSwitchT = SchemaT<'ModeSwitch'>;

export type BindingRequestT = SchemaT<'BindingRequest'>;
export type SimulationRequestT = SchemaT<'SimulationRequest'>;
export type SimulationRunT = SchemaT<'SimulationRun'>;
export type TwinStateT = SchemaT<'TwinState'>;
export type AlertT = SchemaT<'Alert'>;
