import type { components, paths } from '@/types/openapi-saas';

export type SaasSchemaT<K extends keyof components['schemas']> = components['schemas'][K];

export type SaasPlanSessionT = SaasSchemaT<'PlanSession'>;
export type SaasPlanStatusT = SaasPlanSessionT['status'];

export type WithDefaultsT<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type SaasPathT = keyof paths;

export type SaasQueryT<P extends SaasPathT> = paths[P] extends {
  get: { parameters: { query?: infer Q } };
}
  ? NonNullable<Q>
  : never;
