import { HttpResponse } from 'msw';

import { SAAS_API_BASE, SAAS_HEADERS, SAAS_REQUESTED_WITH } from '@/consts/api-saas';
import { type MockOrgT, PLATFORM_ORG_ID, findOrg, meOf } from '@/mocks/saas/orgs';
import { type MockSessionT, mockDb, readSession } from '@/mocks/saas/state';
import type { Me, OrgType } from '@/types/saas';

export type PrincipalT = { org: MockOrgT; me: Me };

export const api = (path: string) => `${SAAS_API_BASE}${path}`;

export const fail = (status: number, detail: string) => HttpResponse.json({ detail }, { status });

export const isSaasRequest = (request: Request) =>
  request.headers.get(SAAS_HEADERS.REQUESTED_WITH) === SAAS_REQUESTED_WITH;

export const csrfFailure = (request: Request) =>
  request.method !== 'GET' && !isSaasRequest(request) ? fail(403, 'CSRF 헤더가 필요합니다') : null;

export const withRole = (me: Me, role: string | null | undefined): Me => {
  if (!role) return me;

  const active = { ...me.active_org, role };

  return {
    ...me,
    active_org: active,
    memberships: me.memberships.map(item => (item.org_id === active.org_id ? active : item)),
  };
};

export const sessionMe = (session: MockSessionT) =>
  withRole(meOf(session.org, session.email, session.name), session.role);

export const authenticate = (request: Request): PrincipalT | Response => {
  const session = readSession();
  if (!session) return fail(401, '로그인이 필요합니다');

  const requestedOrg = request.headers.get(SAAS_HEADERS.ORG_ID);
  if (requestedOrg && requestedOrg !== session.org.org_id) {
    return fail(403, '이 조직에 속해 있지 않습니다');
  }

  const org = findOrg(session.org.org_id) ?? session.org;

  return { org, me: sessionMe({ ...session, org }) };
};

export const authorize = (request: Request, ...roles: OrgType[]): PrincipalT | Response => {
  const csrf = csrfFailure(request);
  if (csrf) return csrf;

  const principal = authenticate(request);
  if (principal instanceof Response) return principal;
  if (roles.length && !roles.includes(principal.org.org_type)) {
    return fail(403, '이 역할로는 접근할 수 없습니다');
  }

  return principal;
};

export const planIds = () => [...mockDb.planCreatedAt.keys()];

const shipperCanRead = (planId: string, org: MockOrgT) => {
  const lots = mockDb.planLots.get(planId);
  if (!lots) return false;

  return mockDb.lots.some(lot => lots.has(lot.id) && org.shipper_ids.includes(lot.shipper_id));
};

export const canReadPlan = (planId: string, org: MockOrgT) => {
  if (!mockDb.planCreatedAt.has(planId)) return false;
  if (org.org_type === 'platform') return org.org_id === PLATFORM_ORG_ID;
  if (org.org_type === 'forwarder') return mockDb.forwarders.get(planId) === org.org_id;

  return shipperCanRead(planId, org);
};
