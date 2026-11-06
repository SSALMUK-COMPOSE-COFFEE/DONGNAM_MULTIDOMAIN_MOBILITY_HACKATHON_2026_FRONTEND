import type { SaasSchemaT } from '@/types/api-saas';

export type SandboxResetT = SaasSchemaT<'SandboxResetResponse'> & {
  world_id: string;
};

export type SaasContaminationT = SaasSchemaT<'Contamination'>;
export type SaasOrgDriftT = SaasSchemaT<'OrgDrift'>;
export type SaasOrgDriftCountsT = SaasOrgDriftT['counts'];
export type SaasMissingSeedLotsT = SaasOrgDriftCountsT['missing_seed_lots'];
