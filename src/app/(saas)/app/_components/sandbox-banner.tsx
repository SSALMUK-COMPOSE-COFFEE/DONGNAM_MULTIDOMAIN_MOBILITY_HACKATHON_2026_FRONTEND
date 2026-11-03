'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useId } from 'react';

import { useMe } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { SandboxResetButton } from '@/app/(saas)/app/_components/sandbox-reset-button';
import { useRoleSwitch } from '@/app/(saas)/app/_components/use-role-switch';
import {
  ORG_TYPES,
  SAAS_ROUTES,
  SANDBOX_SCENARIO_STEPS,
  type SandboxStepT,
} from '@/consts/route-saas';
import type { OrgType } from '@/types/saas';

const SANDBOX_NOTE = '예시 조직 데이터로 둘러보는 중입니다. 실제 거래 데이터와 섞이지 않습니다.';
const SANDBOX_NOTE_SHORT = '예시 데이터 · 실제 거래와 분리';

const ROLE_SHORT: Record<OrgType, string> = {
  platform: '플랫폼',
  shipper: '화주',
  forwarder: '포워더',
};

type RoleSwitchT = ReturnType<typeof useRoleSwitch>;

type ScenarioStepPropsT = {
  step: SandboxStepT;
  activeType: OrgType;
  pathname: string;
  roleSwitch: RoleSwitchT;
};

function ScenarioStep({ step, activeType, pathname, roleSwitch }: ScenarioStepPropsT) {
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
      disabled={roleSwitch.isPending}
      title={`${ROLE_SHORT[step.orgType]}(으)로 바꿔 이동`}
      aria-label={`${step.step} ${step.label} · ${ROLE_SHORT[step.orgType]}(으)로 바꿔 이동`}
      onClick={() => roleSwitch.switchRole(step.orgType, step.href)}
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
                roleSwitch={roleSwitch}
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
              onClick={() => roleSwitch.switchRole(orgType)}
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
