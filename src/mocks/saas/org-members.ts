import { HttpResponse, http } from 'msw';

import { DEMO_EMAIL_DOMAIN } from '@/consts/sandbox-saas';
import { api, authenticate, authorize, csrfFailure, fail, sessionMe } from '@/mocks/saas/access';
import { type MockOrgT, findOrg } from '@/mocks/saas/orgs';
import {
  SEEDED_AT,
  findAccount,
  listAccounts,
  nowIso,
  readSession,
  saveAccount,
  writeSession,
} from '@/mocks/saas/state';
import type {
  Invitation,
  InvitationAccept,
  InvitationCreate,
  InvitationCreated,
  OrgMember,
} from '@/types/saas';

type StoredInvitationT = {
  invitation_id: string;
  org_id: string;
  org_name: string;
  role: string;
  code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: { user_id: string; name: string; email: string } | null;
};

const INVITATIONS_STORAGE_KEY = 'fs.saas.mock.invitations';
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_ONLY = '조직 관리자만 할 수 있습니다';
const SANDBOX_INVITE = '데모(sandbox) 조직에는 초대할 수 없습니다';
const INVALID_INVITATION = '초대 코드가 올바르지 않거나 만료되었습니다';
const ALREADY_MEMBER = '이미 소속된 조직입니다';
const DEMO_ACCOUNT = '데모 계정은 초대 코드를 쓸 수 없습니다';
const INVITATION_NOT_FOUND = '초대 코드를 찾을 수 없습니다';
const MEMBER_ROLES: readonly string[] = ['admin', 'member'];

const readInvitations = (): StoredInvitationT[] => {
  try {
    const raw = localStorage.getItem(INVITATIONS_STORAGE_KEY);

    return raw ? (JSON.parse(raw) as StoredInvitationT[]) : [];
  } catch {
    return [];
  }
};

const writeInvitations = (items: StoredInvitationT[]) =>
  localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(items));

const statusOf = (item: StoredInvitationT): Invitation['status'] => {
  if (item.used_at) return 'used';

  return Date.parse(item.expires_at) <= Date.now() ? 'expired' : 'pending';
};

const invitationView = (item: StoredInvitationT): Invitation => ({
  invitation_id: item.invitation_id,
  org_id: item.org_id,
  role: item.role,
  status: statusOf(item),
  created_at: item.created_at,
  expires_at: item.expires_at,
  used_at: item.used_at,
  used_by: item.used_by ? { user_id: item.used_by.user_id, name: item.used_by.name } : null,
});

const randomCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(9));

  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_');
};

const userIdOf = (email: string) => `user-${email.replace(/[^a-z0-9]/gi, '-')}`;

const isDemoEmail = (email: string) => email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);

export const redeemInvitation = (
  code: string,
  user: { email: string; name: string },
  currentOrgId: string | null = null
): { org: MockOrgT; role: string } | Response => {
  const items = readInvitations();
  const invitation = items.find(item => item.code === code.trim());
  const org = findOrg(invitation?.org_id);
  if (!invitation || !org || statusOf(invitation) !== 'pending') {
    return fail(422, INVALID_INVITATION);
  }
  if (currentOrgId === org.org_id) return fail(409, ALREADY_MEMBER);

  invitation.used_at = nowIso();
  invitation.used_by = { user_id: userIdOf(user.email), name: user.name, email: user.email };
  writeInvitations(items);

  return { org, role: invitation.role };
};

const sandboxStaff = (org: MockOrgT): OrgMember[] =>
  org.sandbox
    ? [
        {
          user_id: `user-${org.org_id}-staff`,
          name: `${org.org_name} 실무 담당`,
          email: `staff.${org.org_id}@${DEMO_EMAIL_DOMAIN}`,
          role: 'member',
          joined_at: SEEDED_AT,
        },
      ]
    : [];

const membersOf = (org: MockOrgT): OrgMember[] => {
  const invited = new Map(
    readInvitations()
      .filter(item => item.org_id === org.org_id && item.used_by)
      .map(item => [item.used_by?.email ?? '', item])
  );
  const session = readSession();
  const people = [
    ...(session && session.org.org_id === org.org_id ? [session] : []),
    ...listAccounts().filter(account => account.org.org_id === org.org_id),
  ];
  const seen = new Set<string>();
  const members = people.flatMap(person => {
    if (seen.has(person.email)) return [];
    seen.add(person.email);
    const invitation = invited.get(person.email);

    return [
      {
        user_id: isDemoEmail(person.email) ? `user-${org.org_id}` : userIdOf(person.email),
        name: person.name,
        email: person.email,
        role: invitation?.role ?? person.role ?? 'admin',
        joined_at: invitation?.used_at ?? SEEDED_AT,
      },
    ];
  });

  return [...members, ...sandboxStaff(org)].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
};

const adminPrincipal = (request: Request) => {
  const principal = authorize(request);
  if (principal instanceof Response) return principal;
  if (principal.me.active_org.role !== 'admin') return fail(403, ADMIN_ONLY);

  return principal;
};

export const orgMemberHandlers = [
  http.get(api('/saas/org/members'), ({ request }) => {
    const principal = authorize(request);
    if (principal instanceof Response) return principal;

    return HttpResponse.json(membersOf(principal.org));
  }),

  http.get(api('/saas/org/invitations'), ({ request }) => {
    const principal = adminPrincipal(request);
    if (principal instanceof Response) return principal;

    return HttpResponse.json(
      readInvitations()
        .filter(item => item.org_id === principal.org.org_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(invitationView)
    );
  }),

  http.post(api('/saas/org/invitations'), async ({ request }) => {
    const principal = adminPrincipal(request);
    if (principal instanceof Response) return principal;

    const { role = 'member' } = ((await request.json().catch(() => ({}))) ??
      {}) as Partial<InvitationCreate>;
    if (!MEMBER_ROLES.includes(role)) return fail(422, '역할은 admin 또는 member 입니다');
    if (principal.org.sandbox) return fail(403, SANDBOX_INVITE);

    const now = new Date();
    const stored: StoredInvitationT = {
      invitation_id: `inv-mock-${now.getTime()}`,
      org_id: principal.org.org_id,
      org_name: principal.org.org_name,
      role,
      code: randomCode(),
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + INVITATION_TTL_MS).toISOString(),
      used_at: null,
      used_by: null,
    };
    writeInvitations([...readInvitations(), stored]);

    const created: InvitationCreated = {
      ...invitationView(stored),
      code: stored.code,
      org_name: stored.org_name,
    };

    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete(api('/saas/org/invitations/:invitationId'), ({ request, params }) => {
    const principal = adminPrincipal(request);
    if (principal instanceof Response) return principal;

    const items = readInvitations();
    const kept = items.filter(
      item => !(item.invitation_id === params.invitationId && item.org_id === principal.org.org_id)
    );
    if (kept.length === items.length) return fail(404, INVITATION_NOT_FOUND);
    writeInvitations(kept);

    return new HttpResponse(null, { status: 204 });
  }),

  http.post(api('/saas/invitations/accept'), async ({ request }) => {
    const csrf = csrfFailure(request);
    if (csrf) return csrf;

    const principal = authenticate(request);
    if (principal instanceof Response) return principal;

    const session = readSession();
    if (!session) return fail(401, '로그인이 필요합니다');
    if (isDemoEmail(session.email)) return fail(403, DEMO_ACCOUNT);

    const { code = '' } = (await request.json()) as Partial<InvitationAccept>;
    const redeemed = redeemInvitation(code, session, principal.org.org_id);
    if (redeemed instanceof Response) return redeemed;

    const next = { ...session, org: redeemed.org, role: redeemed.role };
    writeSession(next);
    const account = findAccount(session.email);
    if (account) saveAccount({ ...account, org: redeemed.org, role: redeemed.role });

    return HttpResponse.json(sessionMe(next));
  }),
];
