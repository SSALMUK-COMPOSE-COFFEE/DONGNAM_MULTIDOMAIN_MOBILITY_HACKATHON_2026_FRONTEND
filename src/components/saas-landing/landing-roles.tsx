import { cn } from 'cn';

import { LANDING_ROLES, ROLE_COPY } from '@/components/saas-landing/content';
import { Skeleton } from '@/components/ui/skeleton';
import type { OrgType } from '@/types/saas';

const AVATAR_TONE: Record<OrgType, string> = {
  platform: 'bg-m2-navy',
  shipper: 'bg-m2-berry',
  forwarder: 'bg-m2-ink-2',
};

const AVATAR: Record<OrgType, string> = {
  platform: 'FS',
  shipper: '화주',
  forwarder: '포워',
};

export function LandingRoles() {
  return (
    <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
      {LANDING_ROLES.map(orgType => (
        <li key={orgType} className="m2-card flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-xl text-[13px] font-bold text-white',
                AVATAR_TONE[orgType]
              )}
            >
              {AVATAR[orgType]}
            </span>
            <h3 className="m2-h3 text-[15px]">{ROLE_COPY[orgType].title}</h3>
          </div>
          <p className="m-0 flex-1 text-[13.5px] leading-relaxed break-keep text-m2-ink-2">
            {ROLE_COPY[orgType].text}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function LandingRolesSkeleton() {
  return (
    <div aria-busy className="grid gap-4 md:grid-cols-3">
      {LANDING_ROLES.map(orgType => (
        <Skeleton key={orgType} className="h-48 w-full rounded-[18px]" />
      ))}
    </div>
  );
}
