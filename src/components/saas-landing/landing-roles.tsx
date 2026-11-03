'use client';

import { cn } from 'cn';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

import { useDemoLogin } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { useEnterApp } from '@/app/(auth)/_components/use-enter-app';
import { LANDING_ROLES, ROLE_COPY } from '@/components/saas-landing/content';
import { Skeleton } from '@/components/ui/skeleton';
import { DEMO_FORWARDER_ORGS, DEMO_PLATFORM_ORG, DEMO_SHIPPER_ORGS } from '@/consts/sandbox-saas';
import type { OrgType } from '@/types/saas';

const AVATAR_TONE: Record<OrgType, string> = {
  platform: 'bg-m2-navy',
  shipper: 'bg-m2-berry',
  forwarder: 'bg-m2-ink-2',
};

const DEMO_ORG: Record<OrgType, { org_id: string; org_name: string }> = {
  shipper: DEMO_SHIPPER_ORGS[0],
  platform: DEMO_PLATFORM_ORG,
  forwarder: DEMO_FORWARDER_ORGS[0],
};

const avatarText = (orgType: OrgType) =>
  orgType === 'platform'
    ? 'FS'
    : (DEMO_ORG[orgType].org_name.split(' ')[0] ?? DEMO_ORG[orgType].org_name).slice(0, 2);

const actionLabel = (orgType: OrgType, chosen: OrgType | null, isPending: boolean) =>
  isPending && chosen === orgType ? '들어가는 중' : ROLE_COPY[orgType].action;

export function LandingRoles() {
  const demoLogin = useDemoLogin();
  const enterApp = useEnterApp();
  const [chosen, setChosen] = useState<OrgType | null>(null);

  const enter = (orgType: OrgType) => {
    setChosen(orgType);
    demoLogin.mutate(
      orgType === 'shipper'
        ? { org_type: orgType, org_id: DEMO_ORG.shipper.org_id }
        : { org_type: orgType },
      { onSuccess: enterApp }
    );
  };

  return (
    <div className="flex flex-col gap-3">
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
                {avatarText(orgType)}
              </span>
              <div className="flex min-w-0 flex-col">
                <h3 className="m2-h3 text-[15px]">{ROLE_COPY[orgType].title}</h3>
                <span className="truncate text-[12.5px] text-m2-muted">
                  {DEMO_ORG[orgType].org_name}
                </span>
              </div>
            </div>
            <p className="m-0 flex-1 text-[13.5px] leading-relaxed break-keep text-m2-ink-2">
              {ROLE_COPY[orgType].text}
            </p>
            <button
              type="button"
              className="m2-btn m2-btn-pri w-full disabled:cursor-wait"
              disabled={demoLogin.isPending}
              aria-busy={demoLogin.isPending && chosen === orgType}
              onClick={() => enter(orgType)}
            >
              {actionLabel(orgType, chosen, demoLogin.isPending)}
              <ArrowRight aria-hidden className="size-4" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
      {demoLogin.isError && (
        <p role="alert" className="m-0 text-[12.5px] font-medium text-m2-crit">
          {authErrorMessage(demoLogin.error, '데모 계정으로 들어가지 못했습니다.')}
        </p>
      )}
    </div>
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
