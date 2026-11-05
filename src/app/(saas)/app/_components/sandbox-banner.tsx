'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, Suspense, useEffect, useState } from 'react';

import {
  applyActiveOrg,
  putActiveOrg,
  readLastOrg,
  useMe,
  useSwitchTargetStore,
  writeLastOrg,
} from '@/apis/saas/auth';
import {
  forwarderConfirmationQueryOptions,
  forwarderPlanOrdersQueryOptions,
} from '@/apis/saas/forwarder';
import { platformPlanOrdersQueryOptions, platformPlansQueryOptions } from '@/apis/saas/platform';
import {
  type PlanConfirmationStateT,
  platformConfirmationQueryOptions,
} from '@/apis/saas/platform-confirm';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { SandboxResetButton } from '@/app/(saas)/app/_components/sandbox-reset-button';
import { PLATFORM_PATHS, readPlanQuery } from '@/app/(saas)/app/platform/_components/paths';
import { SANDBOX_SCENARIO_STEPS, type SandboxStepT, roleHome } from '@/consts/route-saas';
import type { ExecutionOrderT } from '@/types/api';
import type { Membership, OrgType } from '@/types/saas';
import type { ForwarderOrderT } from '@/types/saas-forwarder';

const SANDBOX_NOTE = '예시 업체 데이터로 둘러보는 중입니다. 실제 거래 데이터와 섞이지 않습니다.';
const SANDBOX_NOTE_SHORT = '예시 데이터 · 실제 거래와 분리';

const ROLE_SHORT: Record<OrgType, string> = {
  platform: '서비스 관리자',
  shipper: '화주',
  forwarder: '포워더',
};

const PLAN_SCOPED_PATHS: readonly string[] = [
  `${PLATFORM_PATHS.PLANS}/detail`,
  PLATFORM_PATHS.COLDCHAIN,
  '/app/forwarder/plans/detail',
  '/app/forwarder/coldchain',
];

const shipperSlug = (shipperId: string) => {
  const marker = 'sh-';
  const at = shipperId.lastIndexOf(marker);
  if (at < 0) return shipperId;

  return shipperId.slice(at + marker.length);
};

const matchesShipperOrg = (orgId: string, shipperId: string) => {
  const slug = shipperSlug(shipperId);

  return orgId === `shipper-${slug}` || orgId.endsWith(`-shipper-${slug}`);
};

const pendingShipperOrgId = (
  memberships: readonly Membership[],
  confirmation: PlanConfirmationStateT | null,
  orders: readonly (ExecutionOrderT | ForwarderOrderT)[] | null
) => {
  const pending = new Set<string>();

  for (const row of confirmation?.confirmations ?? []) {
    if (row.status === 'pending') pending.add(row.shipper_org_id);
  }

  for (const order of orders ?? []) {
    for (const row of order.shipper_confirmations) {
      if (row.status !== 'pending') continue;
      const org = memberships.find(
        item => item.org_type === 'shipper' && matchesShipperOrg(item.org_id, row.shipper_id)
      );
      if (org) pending.add(org.org_id);
    }
  }

  return (
    memberships.find(item => item.org_type === 'shipper' && pending.has(item.org_id))?.org_id ??
    null
  );
};

const placeOf = (orgName: string) => orgName.split(/\s+/)[0] || orgName;

type RolePickPropsT = {
  label: string;
  memberships: readonly Membership[];
  activeOrgId: string;
  pendingOrgId: string | null;
  onSwitch: (orgId: string, href: string) => void;
};

function RolePick({ label, memberships, activeOrgId, pendingOrgId, onSwitch }: RolePickPropsT) {
  if (memberships.length === 0) return null;

  const active = memberships.find(item => item.org_id === activeOrgId) ?? null;
  const switching = memberships.some(item => item.org_id === pendingOrgId);
  let face = label;
  if (switching) face = '바꾸는 중';
  else if (active) face = `${label} · ${placeOf(active.org_name)}`;

  return (
    <label className={active ? 'm2-sbx-pick is-on' : 'm2-sbx-pick'}>
      <span className="m2-sbx-pick-face" aria-hidden>
        {face}
        <ChevronDown size={12} strokeWidth={2} />
      </span>
      <select
        aria-label={active ? `${label} · ${active.org_name}` : label}
        title={active?.org_name ?? label}
        className="m2-sbx-select"
        value={active?.org_id ?? ''}
        disabled={pendingOrgId !== null}
        onChange={event => {
          const orgId = event.target.value;
          const membership = memberships.find(item => item.org_id === orgId);
          if (!membership || orgId === activeOrgId) return;
          onSwitch(membership.org_id, roleHome(membership.org_type));
        }}
      >
        <option value="" disabled>
          {label}
        </option>
        {memberships.map(item => (
          <option key={item.org_id} value={item.org_id}>
            {item.org_name}
          </option>
        ))}
      </select>
    </label>
  );
}

type ScenarioStepPropsT = {
  step: SandboxStepT;
  activeOrgId: string;
  targetOrgId: string | null;
  pathname: string;
  pending: boolean;
  onSwitch: (orgId: string, href: string) => void;
};

function ScenarioStep({
  step,
  activeOrgId,
  targetOrgId,
  pathname,
  pending,
  onSwitch,
}: ScenarioStepPropsT) {
  const content = (
    <>
      <span className="m2-sbx-num" aria-hidden>
        {step.step}
      </span>
      {step.label}
    </>
  );

  if (targetOrgId && targetOrgId === activeOrgId) {
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
      disabled={pending || !targetOrgId}
      title={`${ROLE_SHORT[step.orgType]}(으)로 바꿔 이동`}
      aria-label={`${step.label} · ${ROLE_SHORT[step.orgType]}(으)로 바꿔 이동`}
      onClick={() => {
        if (targetOrgId) onSwitch(targetOrgId, step.href);
      }}
    >
      {content}
    </button>
  );
}

function SandboxBannerBody() {
  const { data: me } = useMe();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<unknown>(null);
  const orgId = me?.active_org.org_id ?? '';
  const isPlatform = !!me?.active_org.sandbox && me.active_org.org_type === 'platform';
  const isForwarder = !!me?.active_org.sandbox && me.active_org.org_type === 'forwarder';
  const planPath = pathname.replace(/\/$/, '');
  const planId = PLAN_SCOPED_PATHS.includes(planPath) ? readPlanQuery(searchParams) : null;
  const plansQuery = useQuery({
    ...platformPlansQueryOptions(orgId),
    enabled: isPlatform,
  });
  const confirmationQuery = useQuery({
    ...platformConfirmationQueryOptions(orgId, planId ?? ''),
    enabled: isPlatform && !!planId,
  });
  const ordersQuery = useQuery({
    ...platformPlanOrdersQueryOptions(orgId, planId ?? ''),
    enabled: isPlatform && !!planId,
  });
  const forwarderConfirmationQuery = useQuery({
    ...forwarderConfirmationQueryOptions(orgId, planId ?? ''),
    enabled: isForwarder && !!planId,
  });
  const forwarderOrdersQuery = useQuery({
    ...forwarderPlanOrdersQueryOptions(orgId, planId ?? ''),
    enabled: isForwarder && !!planId,
  });
  const assignedForwarderId =
    planId && plansQuery.data
      ? (plansQuery.data.find(plan => plan.plan_id === planId)?.forwarder?.org_id ?? null)
      : null;
  const worldId = me?.world?.world_id ?? null;
  const memberships = me?.memberships;

  useEffect(() => {
    if (!worldId || !assignedForwarderId || !memberships) return;
    const known = memberships.some(
      item => item.org_type === 'forwarder' && item.org_id === assignedForwarderId
    );
    if (known) writeLastOrg(worldId, 'forwarder', assignedForwarderId);
  }, [assignedForwarderId, memberships, worldId]);

  if (!me?.active_org.sandbox || !memberships) return null;

  const active = me.active_org;
  const platform = memberships.find(item => item.org_type === 'platform') ?? null;
  const shippers = memberships.filter(item => item.org_type === 'shipper');
  const forwarders = memberships.filter(item => item.org_type === 'forwarder');

  const resolveShipperOrgId = () => {
    if (planId) {
      const pending = pendingShipperOrgId(
        shippers,
        (isForwarder ? forwarderConfirmationQuery.data : confirmationQuery.data) ?? null,
        (isForwarder ? forwarderOrdersQuery.data : ordersQuery.data) ?? null
      );
      if (pending) return pending;
    }

    return readLastOrg(worldId, 'shipper', shippers) ?? shippers[0]?.org_id ?? null;
  };

  const resolveForwarderOrgId = () => {
    if (assignedForwarderId) {
      const assigned = forwarders.find(item => item.org_id === assignedForwarderId);
      if (assigned) return assigned.org_id;
    }

    return readLastOrg(worldId, 'forwarder', forwarders) ?? forwarders[0]?.org_id ?? null;
  };

  const targetOrgId = (orgType: OrgType) => {
    if (orgType === 'platform') return platform?.org_id ?? null;
    if (orgType === 'shipper') return resolveShipperOrgId();

    return resolveForwarderOrgId();
  };

  const activate = async (orgIdTo: string, href: string) => {
    setSwitchError(null);
    useSwitchTargetStore.getState().setTarget(href);
    if (orgIdTo === active.org_id) {
      router.push(href);
      return;
    }

    setPendingOrgId(orgIdTo);
    try {
      const next = await putActiveOrg(orgIdTo);
      applyActiveOrg(queryClient, next);
      router.push(href);
    } catch (error) {
      useSwitchTargetStore.getState().setTarget(null);
      setSwitchError(error);
    } finally {
      setPendingOrgId(null);
    }
  };

  return (
    <section aria-label="데모 환경" className="m2-banner m2-sbx">
      <span className="m2-chip m2-chip-navy" title={SANDBOX_NOTE}>
        데모 환경
      </span>
      {switchError ? (
        <span role="alert" className="m2-sbx-note m2-sbx-err">
          {authErrorMessage(switchError, '역할을 바꾸지 못했습니다.')}
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
                activeOrgId={active.org_id}
                targetOrgId={targetOrgId(step.orgType)}
                pathname={pathname}
                pending={pendingOrgId !== null}
                onSwitch={activate}
              />
            </li>
          </Fragment>
        ))}
      </ol>

      <div className="m2-sbx-acts">
        <div role="group" aria-label="역할 바꿔 보기" className="m2-sbx-roles">
          {platform ? (
            <button
              type="button"
              className="m2-sbx-role"
              aria-pressed={platform.org_id === active.org_id}
              disabled={pendingOrgId !== null}
              title={platform.org_name}
              onClick={() => activate(platform.org_id, roleHome('platform'))}
            >
              {pendingOrgId === platform.org_id ? '바꾸는 중' : ROLE_SHORT.platform}
            </button>
          ) : null}
          <RolePick
            label="화주"
            memberships={shippers}
            activeOrgId={active.org_id}
            pendingOrgId={pendingOrgId}
            onSwitch={activate}
          />
          <RolePick
            label="포워더"
            memberships={forwarders}
            activeOrgId={active.org_id}
            pendingOrgId={pendingOrgId}
            onSwitch={activate}
          />
        </div>
        <SandboxResetButton />
      </div>
    </section>
  );
}

export function SandboxBanner() {
  return (
    <Suspense fallback={null}>
      <SandboxBannerBody />
    </Suspense>
  );
}
