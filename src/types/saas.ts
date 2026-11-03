export type OrgType = 'platform' | 'shipper' | 'forwarder';
export type SignupOrgType = Exclude<OrgType, 'platform'>;

export type MeUser = {
  id: string;
  email: string;
  name: string;
};

export type Membership = {
  org_id: string;
  org_type: OrgType;
  org_name: string;
  role: string;
};

export type Me = {
  user: MeUser;
  memberships: Membership[];
  active_org: Membership;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  email: string;
  password: string;
  name: string;
  org_name: string;
  org_type: SignupOrgType;
};

export type DemoLoginRequest = {
  org_type: OrgType;
};

export type OrgTypeT = OrgType;
export type SignupOrgTypeT = SignupOrgType;
export type MeUserT = MeUser;
export type MembershipT = Membership;
export type MeT = Me;
export type LoginRequestT = LoginRequest;
export type SignupRequestT = SignupRequest;
export type DemoLoginRequestT = DemoLoginRequest;
