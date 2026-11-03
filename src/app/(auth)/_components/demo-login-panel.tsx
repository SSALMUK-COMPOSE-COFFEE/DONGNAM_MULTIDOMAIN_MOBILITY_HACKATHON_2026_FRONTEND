'use client';

import { cn } from 'cn';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

import { useDemoLogin } from '@/apis/saas/auth';
import { authErrorMessage } from '@/app/(auth)/_components/auth-error';
import { useEnterApp } from '@/app/(auth)/_components/use-enter-app';
import { roleLinkKeys, useShowcaseScene } from '@/app/(auth)/_components/use-showcase-scene';
import { useMapLinkTarget } from '@/components/map-link';
import { ORG_TYPES, SAAS_ROUTES } from '@/consts/route-saas';
import { DEMO_FORWARDER_ORGS, DEMO_PLATFORM_ORG, DEMO_SHIPPER_ORGS } from '@/consts/sandbox-saas';
import type { OrgType } from '@/types/saas';

const DEMO_DESCRIPTIONS: Record<OrgType, string> = {
  platform: '출하 풀 → 공동적재 계획 생성 · 포워더 배정 · 정산',
  shipper: '출하 등록 · 계획 확정 · 내 절감액',
  forwarder: '실행 지시 · 집하 경로 · 콜드체인',
};

const AVATAR_TONE: Record<OrgType, string> = {
  platform: 'bg-m2-navy',
  shipper: 'bg-m2-berry',
  forwarder: 'bg-m2-ink-2',
};

const avatarText = (orgType: OrgType, orgName: string) =>
  orgType === 'platform' ? 'FS' : (orgName.split(' ')[0] ?? orgName).slice(0, 2);

type RoleButtonPropsT = {
  orgType: OrgType;
  title: string;
  avatar: string;
  linkKeys: string[];
  disabled: boolean;
  isEntering: boolean;
  onEnter: () => void;
};

function RoleButton({
  orgType,
  title,
  avatar,
  linkKeys,
  disabled,
  isEntering,
  onEnter,
}: RoleButtonPropsT) {
  const { className: linkClassName, ...link } = useMapLinkTarget(linkKeys, { pickable: false });

  return (
    <button
      type="button"
      {...link}
      disabled={disabled}
      onClick={onEnter}
      className={cn('m2-role disabled:cursor-wait disabled:opacity-60', linkClassName)}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-10 place-items-center rounded-xl text-[13px] font-bold text-white',
          AVATAR_TONE[orgType]
        )}
      >
        {avatar}
      </span>
      <span className="flex min-w-0 flex-col">
        <b className="truncate text-sm font-semibold">{title}</b>
        <small className="text-[12.5px] text-m2-muted">{DEMO_DESCRIPTIONS[orgType]}</small>
      </span>
      <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold whitespace-nowrap text-m2-brand-ink">
        {isEntering ? '들어가는 중' : '들어가기'}
        <ArrowRight aria-hidden className="size-3.5" strokeWidth={2} />
      </span>
    </button>
  );
}

export function DemoLoginPanel() {
  const demoLogin = useDemoLogin();
  const enterApp = useEnterApp();
  const { scene } = useShowcaseScene();
  const [chosen, setChosen] = useState<OrgType | null>(null);
  const [shipperOrgId, setShipperOrgId] = useState<string>(DEMO_SHIPPER_ORGS[0].org_id);
  const [isPickingShipper, setIsPickingShipper] = useState(false);
  const shipperOrg =
    DEMO_SHIPPER_ORGS.find(({ org_id }) => org_id === shipperOrgId) ?? DEMO_SHIPPER_ORGS[0];
  const orgNames: Record<OrgType, string> = {
    platform: DEMO_PLATFORM_ORG.org_name,
    shipper: shipperOrg.org_name,
    forwarder: DEMO_FORWARDER_ORGS[0].org_name,
  };

  const enter = (orgType: OrgType) => {
    setChosen(orgType);
    demoLogin.mutate(
      orgType === 'shipper'
        ? { org_type: orgType, org_id: shipperOrg.org_id }
        : { org_type: orgType },
      { onSuccess: enterApp }
    );
  };

  return (
    <div className="flex flex-col gap-2.5">
      {ORG_TYPES.map(orgType => (
        <div key={orgType} className="flex flex-col gap-2">
          <RoleButton
            orgType={orgType}
            title={
              orgType === 'platform'
                ? SAAS_ROUTES.platform.label
                : `${SAAS_ROUTES[orgType].label} · ${orgNames[orgType]}`
            }
            avatar={avatarText(orgType, orgNames[orgType])}
            linkKeys={roleLinkKeys(scene, orgType, shipperOrg.org_id)}
            disabled={demoLogin.isPending}
            isEntering={demoLogin.isPending && chosen === orgType}
            onEnter={() => enter(orgType)}
          />

          {orgType === 'shipper' && !isPickingShipper && (
            <button
              type="button"
              disabled={demoLogin.isPending}
              onClick={() => setIsPickingShipper(true)}
              className="self-end px-1 text-[12.5px] font-semibold text-m2-brand-ink disabled:opacity-50"
            >
              다른 화주로 바꾸기
            </button>
          )}
          {orgType === 'shipper' && isPickingShipper && (
            <select
              aria-label="데모 화주 조직"
              className="m2-inp w-full"
              value={shipperOrg.org_id}
              disabled={demoLogin.isPending}
              onChange={event => setShipperOrgId(event.target.value)}
            >
              {DEMO_SHIPPER_ORGS.map(({ org_id, org_name }) => (
                <option key={org_id} value={org_id}>
                  {org_name}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}

      {demoLogin.isError && (
        <p role="alert" className="text-[12.5px] font-medium text-m2-crit">
          {authErrorMessage(demoLogin.error, '데모 계정으로 들어가지 못했습니다.')}
        </p>
      )}
    </div>
  );
}
