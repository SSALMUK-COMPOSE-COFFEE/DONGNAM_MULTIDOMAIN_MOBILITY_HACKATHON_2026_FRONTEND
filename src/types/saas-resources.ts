import type { SaasSchemaT } from '@/types/api-saas';

export type ResourceT = SaasSchemaT<'ResourceOut'>;
export type ResourceInputT = SaasSchemaT<'ResourceCreate'>;
export type ResourcePatchT = SaasSchemaT<'ResourcePatch'>;
export type ResourceOptionsT = SaasSchemaT<'ResourceOptions'>;
