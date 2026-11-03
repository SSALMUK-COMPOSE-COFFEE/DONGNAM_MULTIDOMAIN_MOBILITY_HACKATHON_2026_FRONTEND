'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useId } from 'react';

import { useMe } from '@/apis/saas/auth';
import { platformPlansQueryOptions } from '@/apis/saas/platform';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { useDemoOrgStore } from '@/app/(saas)/app/_components/demo-org-store';
import { SandboxResetButton } from '@/app/(saas)/app/_components/sandbox-reset-button';
import { useRoleSwitch } from '@/app/(saas)/app/_components/use-role-switch';
import { PLATFORM_PATHS, readPlanQuery } from '@/app/(saas)/app/platform/_components/paths';
import {
  ORG_TYPES,
  SAAS_ROUTES,
  SANDBOX_SCENARIO_STEPS,
  type SandboxStepT,
  roleHome,
} from '@/consts/route-saas';
import type { OrgType } from '@/types/saas';
import type { PlatformPlanItemT } from '@/types/saas-platform';

const SANDBOX_NOTE = '예시 조직 데이터로 둘러보는 중입니다. 실제 거래 데이터와 섞이지 않습니다.';
const SANDBOX_NOTE_SHORT = '예시 데이터 · 실제 거래와 분리';

const ROLE_SHORT: Record<OrgType, string> = {
  platform: '플랫폼',
  shipper: '화주',
  forwarder: '포워더',
};

const PLAN_SCOPED_PATHS: readonly string[] = [
  `${PLATFORM_PATHS.PLANS}/detail`,
  PLATFORM_PATHS.COLDCHAIN,
];

const currentPlanIdOf = (pathname: string) => {
  if (!PLAN_SCOPED_PATHS.includes(pathname.replace(/\/$/, ''))) return null;

  return readPlanQuery(new URLSearchParams(window.location.search));
};

const assignedForwarderOf = (plans: readonly PlatformPlanItemT[], pathname: string) => {
  const planId = currentPlanIdOf(pathname);
  const current = planId ? plans.find(plan => plan.plan_id === planId) : null;

  if (current) return current.forwarder?.org_id ?? null;

  const latest = plans
    .filter(plan => plan.forwarder)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  return latest?.forwarder?.org_id ?? null;
};

type ScenarioStepPropsT = {
  step: SandboxStepT;
  activeType: OrgType;
  pathname: string;
  onSwitch: (orgType: OrgType, target: string) => void;
  isPending: boolean;
};

function ScenarioStep({ step, activeType, pathname, onSwitch, isPending }: ScenarioStepPropsT) {
  const content = (
    <>
      <span className="m2-sbx-num" aria-hidden>
        {step.step}
      </span>
      {step.label}
    </>
  );

  if (step.orgType === activeType) {
    return (
      <Link
        href={step.href}
        className="m2-sbx-step"
        aria-current={pathname === step.href ? 'step' : false}
        title={`${ROLE_SHORT[step.orgType]} 화면`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="m2-sbx-step"
      disabled={isPending}
      title={`${ROLE_SHORT[step.orgType]}(으)로 바꿔 이동`}
      aria-label={`${step.step} ${step.label} · ${ROLE_SHORT[step.orgType]}(으)로 바꿔 이동`}
      onClick={() => onSwitch(step.orgType, step.href)}
    >
      {content}
    </button>
  );
}

export function SandboxBanner() {
  const { data: me } = useMe();
  const pathname = usePathname();
  const roleSwitch = useRoleSwitch();
  const roleLabelId = useId();
  const isSandboxPlatform = !!me?.active_org.sandbox && me.active_org.org_type === 'platform';
  const plans = useQuery({
    ...platformPlansQueryOptions(me?.active_org.org_id ?? ''),
    enabled: isSandboxPlatform,
  }).data;
  const switchTo = (orgType: OrgType, target: string = roleHome(orgType)) => {
    const forwarderOrgId = isSandboxPlatform && plans ? assignedForwarderOf(plans, pathname) : null;
    if (forwarderOrgId) useDemoOrgStore.getState().remember('forwarder', forwarderOrgId);
    roleSwitch.switchRole(orgType, target);
  };

  if (!me?.active_org.sandbox) return null;

  const activeType = me.active_org.org_type;

  return (
    <section aria-label="데모 환경" className="m2-banner m2-sbx">
      <span className="m2-chip m2-chip-navy" title={SANDBOX_NOTE}>
        데모 환경
      </span>
      {roleSwitch.isError ? (
        <span role="alert" className="m2-sbx-note m2-sbx-err">
          {authErrorMessage(roleSwitch.error, '역할을 바꾸지 못했습니다.')}
        </span>
      ) : (
        <span className="m2-sbx-note">{SANDBOX_NOTE_SHORT}</span>
      )}

      <ol className="m2-sbx-steps" aria-label="시나리오 단계">
        {SANDBOX_SCENARIO_STEPS.map((step, index) => (
          <Fragment key={step.step}>
            {index > 0 ? (
              <li className="m2-sbx-sep" aria-hidden>
                <ChevronRight size={12} strokeWidth={2} />
              </li>
            ) : null}
            <li>
              <ScenarioStep
                step={step}
                activeType={activeType}
                pathname={pathname}
                onSwitch={switchTo}
                isPending={roleSwitch.isPending}
              />
            </li>
          </Fragment>
        ))}
      </ol>

      <div className="m2-sbx-acts">
        <span id={roleLabelId} className="m2-sbx-l">
          역할 바꿔 보기
        </span>
        <div role="group" aria-labelledby={roleLabelId} className="m2-sbx-roles">
          {ORG_TYPES.map(orgType => (
            <button
              key={orgType}
              type="button"
              className="m2-sbx-role"
              aria-pressed={orgType === activeType}
              disabled={roleSwitch.isPending || orgType === activeType}
              title={SAAS_ROUTES[orgType].label}
              onClick={() => switchTo(orgType)}
            >
              {roleSwitch.pendingType === orgType ? '바꾸는 중' : ROLE_SHORT[orgType]}
            </button>
          ))}
        </div>
        <SandboxResetButton />
      </div>
    </section>
  );
}
