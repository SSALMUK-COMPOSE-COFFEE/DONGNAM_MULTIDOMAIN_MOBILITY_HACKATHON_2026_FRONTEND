import type { SaasSchemaT, WithDefaultsT } from '@/types/api-saas';

export type PlatformFuelShockRequestT = Omit<
  WithDefaultsT<SaasSchemaT<'FuelShockRequest'>, 'find_thresholds' | 'threshold_max'>,
  'plan_id' | 'scenario_id'
>;
export type PlatformFuelShockResultT = SaasSchemaT<'FuelShockResult'>;

export type ForecastOptionsT = SaasSchemaT<'ForecastOptions'>;
export type ForecastPresetT = NonNullable<ForecastOptionsT['preset']>;
export type ForecastWeatherT = ForecastOptionsT['weather'];
export type DelayForecastRequestT = Partial<ForecastOptionsT>;
export type DelayForecastResponseT = SaasSchemaT<'DelayForecastResponse'>;
export type DelayForecastReplanT = SaasSchemaT<'DelayForecastReplan'>;
export type VoyageForecastT = SaasSchemaT<'VoyageForecast'>;
export type AirSwitchProposalT = SaasSchemaT<'AirSwitchProposal'>;

export type ScheduleCheckRequestT = Partial<SaasSchemaT<'ScheduleCheckRequest'>>;
export type ScheduleCheckResponseT = SaasSchemaT<'ScheduleCheckResponse'>;
export type ScheduleCheckInputT = ScheduleCheckRequestT & { demo?: boolean };

export type AirSeaComparisonT = SaasSchemaT<'AirSeaComparison'>;

export type BenchmarkResultT = SaasSchemaT<'BenchmarkResult'>;

export type SettlementPreviewT = SaasSchemaT<'SettlementPreview'>;

export type ArrivalRequestT = SaasSchemaT<'ArrivalRequest'>;
export type ArrivalSettlementResultT = SaasSchemaT<'ArrivalSettlementResult'>;

export type PortCongestionT = SaasSchemaT<'PortCongestion'>;

export type LossTableT = SaasSchemaT<'LossTable'>;

export type ProvenanceEntryT = {
  path: string;
  kind: string;
  recorded_source: string;
  verification_status: string;
  values: Record<string, unknown>;
};

export type ProvenanceAssetT = {
  path: string;
  sha256: string;
  bytes: number;
  kind: string;
  metadata: Record<string, unknown>;
};

export type ProvenanceCatalogT = {
  scenario_id: string;
  scope: string;
  counts: Record<string, number>;
  entries: ProvenanceEntryT[];
  assets: ProvenanceAssetT[];
  limitations: string[];
};

export type WeatherUseT = SaasSchemaT<'WeatherUse'>;
export type RemainingRiskVoyageT = SaasSchemaT<'RemainingRisk'>;

export type ScheduleCheckDataSourceT = ScheduleCheckResponseT['data_source'];
export type DelayAdditionalVoyageT = SaasSchemaT<'VoyageDelay'>;
export type BenchmarkBasisT = SaasSchemaT<'BenchmarkBasis'>;
export type BenchmarkMethodBasisGapT = SaasSchemaT<'MethodBasisGap'>;
