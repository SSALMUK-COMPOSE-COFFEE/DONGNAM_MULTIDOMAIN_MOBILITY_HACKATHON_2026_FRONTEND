'use client';

import { useRouter } from 'next/navigation';

import { useSwitchOrg } from '@/apis/saas/auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SAAS_ROUTES, roleHome } from '@/consts/route-saas';
import type { Me, Membership, OrgType } from '@/types/saas';

const AVATAR_COLOR: Record<OrgType, string> = {
  platform: '#0d2a5e',
  shipper: '#d93a40',
  forwarder: '#3a4658',
};

const ROLE_INITIAL: Record<OrgType, string> = {
  platform: 'P',
  shipper: 'S',
  forwarder: 'F',
};

const MEMBER_ROLE_LABEL: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  member: '담당자',
};

export const orgInitials = (membership: Pick<Membership, 'org_name' | 'org_type'>) => {
  const compact = membership.org_name.replace(/\s+/g, '');

  return compact.length >= 2 ? compact.slice(0, 2) : ROLE_INITIAL[membership.org_type];
};

const roleLine = (membership: Membership) => {
  const roleLabel = MEMBER_ROLE_LABEL[membership.role] ?? membership.role;

  return [SAAS_ROUTES[membership.org_type].label, roleLabel].filter(Boolean).join(' · ');
};

function OrgAvatar({ membership }: { membership: Membership }) {
  return (
    <span className="m2-av" style={{ background: AVATAR_COLOR[membership.org_type] }} aria-hidden>
      {orgInitials(membership)}
    </span>
  );
}

export function OrgSwitcher({ me }: { me: Me }) {
  const router = useRouter();
  const switchOrg = useSwitchOrg();
  const { active_org: active, memberships } = me;

  if (memberships.length <= 1) {
    return (
      <div className="m2-org" title={active.org_name}>
        <OrgAvatar membership={active} />
        <div className="m2-org-text">
          <div className="m2-org-nm">{active.org_name}</div>
          <div className="m2-org-rl">{roleLine(active)}</div>
        </div>
      </div>
    );
  }

  return (
    <Select
      value={active.org_id}
      onValueChange={orgId => {
        const target = memberships.find(membership => membership.org_id === orgId);

        if (!target || orgId === active.org_id) return;

        switchOrg(orgId).then(isSwitched => {
          if (isSwitched) router.replace(roleHome(target.org_type));
        });
      }}
    >
      <SelectTrigger
        aria-label={`조직 전환 · 현재 ${active.org_name}`}
        title={active.org_name}
        className="m2-org w-full rounded-xl border-0 bg-transparent px-2.5 shadow-none"
        style={{ height: 'auto', paddingTop: 8, paddingBottom: 12 }}
      >
        <OrgAvatar membership={active} />
        <div className="m2-org-text">
          <div className="m2-org-nm">{active.org_name}</div>
          <div className="m2-org-rl">{roleLine(active)}</div>
        </div>
        <span className="sr-only">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {memberships.map(({ org_id, org_name, org_type }) => (
          <SelectItem key={org_id} value={org_id}>
            {org_name} · {SAAS_ROUTES[org_type].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
