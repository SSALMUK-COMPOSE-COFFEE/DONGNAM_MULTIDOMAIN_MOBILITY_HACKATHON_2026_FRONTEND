import type { SaasSchemaT } from '@/types/api-saas';

export type QuantityPolicyT = SaasSchemaT<'QuantityPolicy'>;
export type QuantityPolicyInputT = SaasSchemaT<'PolicyUpdateBody'>;
export type ReservationStateT = SaasSchemaT<'ReservationState'>;
export type VoyageQuantityStateT = SaasSchemaT<'VoyageQuantityState'>;
export type QuantityQuoteT = SaasSchemaT<'QuoteResponse'>;
export type QuantityChangeResultT = SaasSchemaT<'QuantityChangeResponse'>;
export type QuantityStatementRowT = SaasSchemaT<'StatementRow'>;
export type RefillOfferT = SaasSchemaT<'RefillOfferView'>;
export type RefillOverviewT = SaasSchemaT<'RefillOverview'>;
export type QuantityQuoteInputT = SaasSchemaT<'QuantityBody'>;
export type SubmitQuantityInputT = SaasSchemaT<'SubmitQuantityBody'>;
export type ConfirmQuantityInputT = SaasSchemaT<'ConfirmQuantityBody'>;
export type AcceptRefillInputT = SaasSchemaT<'AcceptRefillBody'>;
export type DeclineRefillInputT = SaasSchemaT<'DeclineRefillBody'>;

export type QuantityDepartureInputT = SaasSchemaT<'DepartureBody'>;
