import type { SaasSchemaT } from '@/types/api-saas';

export type OrgType = NonNullable<SaasSchemaT<'DemoLoginRequest'>['org_type']>;
export type SignupOrgType = NonNullable<SaasSchemaT<'SignupRequest'>['org_type']>;

export type MeUser = SaasSchemaT<'MeUser'>;

export type Membership = Omit<SaasSchemaT<'OrgMembership'>, 'org_type'> & {
  org_type: OrgType;
};

export type SandboxWorld = SaasSchemaT<'WorldView'>;

export type Me = Omit<SaasSchemaT<'Me'>, 'memberships' | 'active_org'> & {
  memberships: Membership[];
  active_org: Membership;
};

export type LoginRequest = SaasSchemaT<'LoginRequest'>;

export type SignupRequest = SaasSchemaT<'SignupRequest'>;

export type DemoLoginRequest = SaasSchemaT<'DemoLoginRequest'>;

export type ActiveOrgRequest = SaasSchemaT<'ActiveOrgRequest'>;

export type OrgMember = SaasSchemaT<'OrgMember'>;

export type InvitationCreate = SaasSchemaT<'InvitationCreate'>;
export type Invitation = SaasSchemaT<'Invitation'>;
export type InvitationCreated = SaasSchemaT<'InvitationCreated'>;
export type InvitationAccept = SaasSchemaT<'InvitationAccept'>;
export type InvitationStatus = Invitation['status'];
