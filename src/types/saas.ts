import type { SaasSchemaT } from '@/types/api-saas';

export type OrgType = SaasSchemaT<'DemoLoginRequest'>['org_type'];
export type SignupOrgType = SaasSchemaT<'SignupRequest'>['org_type'];

export type MeUser = SaasSchemaT<'MeUser'>;

export type Membership = Omit<SaasSchemaT<'OrgMembership'>, 'org_type'> & {
  org_type: OrgType;
};

export type Me = Omit<SaasSchemaT<'Me'>, 'memberships' | 'active_org'> & {
  memberships: Membership[];
  active_org: Membership;
};

export type LoginRequest = SaasSchemaT<'LoginRequest'>;

export type SignupRequest = SaasSchemaT<'SignupRequest'>;

export type DemoLoginRequest = SaasSchemaT<'DemoLoginRequest'>;
