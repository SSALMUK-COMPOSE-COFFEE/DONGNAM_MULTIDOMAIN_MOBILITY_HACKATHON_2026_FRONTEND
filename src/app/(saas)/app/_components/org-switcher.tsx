'use client';

import { useRouter } from 'next/navigation';

import { useSwitchOrg } from '@/apis/saas/auth';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SAAS_ROUTES, roleHome } from '@/consts/route-saas';
import type { Me } from '@/types/saas';

export function OrgSwitcher({ me }: { me: Me }) {
  const router = useRouter();
  const switchOrg = useSwitchOrg();
  const { active_org: active, memberships } = me;

  if (memberships.length <= 1) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border bg-panel px-4 py-3">
        <Badge className="bg-navy text-white">{SAAS_ROUTES[active.org_type].label}</Badge>
        <p className="truncate text-base font-bold text-navy">{active.org_name}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="px-2 text-sm font-bold text-muted-foreground">조직</span>
      <Select
        value={active.org_id}
        onValueChange={orgId => {
          const target = memberships.find(membership => membership.org_id === orgId);

          if (!target || orgId === active.org_id) return;

          switchOrg(orgId);
          router.replace(roleHome(target.org_type));
        }}
      >
        <SelectTrigger aria-label="조직 전환" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {memberships.map(({ org_id, org_name, org_type }) => (
            <SelectItem key={org_id} value={org_id}>
              {org_name} · {SAAS_ROUTES[org_type].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
