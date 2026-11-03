'use client';

import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { useShipperProfile, useUpdateShipperProfile } from '@/apis/saas/shipper-profile';
import { CardSkeleton, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { PackhouseForm } from '@/app/(saas)/app/shipper/onboarding/_components/packhouse-form';
import { Steps } from '@/components/map-hero';
import type { PackhouseT, ShipperProfileViewT } from '@/types/saas-shipper';

const fmtCoord = (value: number) => value.toFixed(4);

type CreatedT = { packhouse: PackhouseT; first: boolean };

function PackhouseList({
  view,
  onSwitched,
}: {
  view: ShipperProfileViewT;
  onSwitched: () => void;
}) {
  const updateProfile = useUpdateShipperProfile();
  const productName = (productId: string) =>
    (view.product_options.find(item => item.product_id === productId)?.name ?? '품목').replace(
      /SO2/g,
      'SO₂'
    );
  const products = (view.profile?.product_ids ?? []).map(productName);
  const canSwitch = !view.sandbox && !!view.profile;

  return (
    <ul className="flex flex-col gap-2">
      {view.packhouses.map(packhouse => {
        const isDefault = view.profile?.packhouse_id === packhouse.packhouse_id;
        const isSwitching =
          updateProfile.isPending &&
          updateProfile.variables?.packhouse_id === packhouse.packhouse_id;

        return (
          <li
            key={packhouse.packhouse_id}
            title={packhouse.packhouse_id}
            className="m2-block flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            <CheckIcon size={16} className="flex-none text-m2-ok" aria-hidden />
            <b className="text-[13.5px]">{packhouse.name}</b>
            <span className="m2-sub mt-0">{packhouse.region}</span>
            <span className="m2-sub m2-num mt-0 text-[12px]">
              위도 {fmtCoord(packhouse.lat)} · 경도 {fmtCoord(packhouse.lon)}
            </span>
            {isDefault && <span className="m2-chip m2-chip-brand">기본 선과장</span>}
            {!isDefault && canSwitch && (
              <button
                type="button"
                className="m2-btn m2-btn-sec m2-btn-sm ml-auto"
                aria-disabled={updateProfile.isPending}
                aria-label={`${packhouse.name} 기본 선과장으로 지정`}
                onClick={() => {
                  if (updateProfile.isPending) return;
                  updateProfile.mutate(
                    { packhouse_id: packhouse.packhouse_id },
                    { onSuccess: onSwitched }
                  );
                }}
              >
                {isSwitching ? '지정 중' : '기본 선과장으로'}
              </button>
            )}
          </li>
        );
      })}
      {products.length > 0 && (
        <li className="m2-sub mt-0 text-[12.5px]">취급 품목 · {products.join(', ')}</li>
      )}
    </ul>
  );
}

export function OnboardingView() {
  const profile = useShipperProfile();
  const [created, setCreated] = useState<CreatedT | null>(null);
  const doneTitleRef = useRef<HTMLHeadingElement>(null);
  const ready = !!profile.data?.ready && (profile.data?.packhouses.length ?? 0) > 0;

  useEffect(() => {
    if (created && ready) doneTitleRef.current?.focus();
  }, [created, ready]);

  if (profile.isError) {
    return (
      <QueryError
        message="화주 정보를 불러오지 못했습니다."
        onRetry={() => profile.refetch()}
        isRetrying={profile.isFetching}
      />
    );
  }
  if (profile.isPending) return <CardSkeleton height={520} />;

  const view = profile.data;
  const defaultPackhouse =
    view.packhouses.find(item => item.packhouse_id === view.profile?.packhouse_id) ??
    view.packhouses[0];
  const createdIsDefault = created?.packhouse.packhouse_id === view.profile?.packhouse_id;
  const doneTitle = () => {
    if (!created) return '등록된 선과장';

    return created.first ? '선과장 등록을 마쳤어요' : '선과장을 하나 더 등록했어요';
  };

  return (
    <div className="flex flex-col gap-4">
      <Steps
        className="max-[767.98px]:grid max-[767.98px]:grid-cols-2"
        items={[
          {
            title: '선과장 등록',
            sub: ready ? (defaultPackhouse?.name ?? '') : '이름·주소·좌표·품목',
            state: ready ? 'done' : 'cur',
          },
          { title: '출하 등록', sub: '품목·수량 등 다섯 가지', state: ready ? 'cur' : 'todo' },
        ]}
      />

      {ready && (
        <section className="m2-card" aria-labelledby="onboarding-done-title">
          <div className="m2-card-h flex-wrap">
            <h2
              id="onboarding-done-title"
              ref={doneTitleRef}
              tabIndex={-1}
              className="m2-h2 outline-none"
            >
              {doneTitle()}
            </h2>
            <Link href={SHIPPER_PATHS.LOTS} className="m2-btn m2-btn-pri">
              {created?.first ? '첫 출하 등록하기' : '출하 등록하기'}
              <ArrowRightIcon size={14} aria-hidden />
            </Link>
          </div>
          {created && !created.first && !createdIsDefault && (
            <div className="m2-note mt-0 mb-3">
              <div>
                출하는 기본 선과장({defaultPackhouse?.name})에서 집하합니다. 새로 등록한{' '}
                {created.packhouse.name}에서 집하하려면 아래 목록에서 기본 선과장으로 지정하세요.
              </div>
            </div>
          )}
          <PackhouseList view={view} onSwitched={() => doneTitleRef.current?.focus()} />
        </section>
      )}

      {view.sandbox ? (
        <div className="m2-note mt-0">
          <div>데모 조직은 선과장이 정해져 있어 새로 등록할 수 없습니다.</div>
        </div>
      ) : (
        <section
          className="m2-card mx-auto w-full max-w-[720px]"
          aria-labelledby="onboarding-form-title"
        >
          <h2 id="onboarding-form-title" className="m2-h2">
            {ready ? '다른 선과장 추가' : '내 선과장 알려주기'}
          </h2>
          <div className="m2-sub mb-4">
            {ready
              ? '추가한 선과장은 위 목록에서 기본 선과장으로 지정해야 출하에 쓰입니다. 좌표를 잘못 넣었다면 바른 좌표로 새로 등록한 뒤 기본으로 지정하세요.'
              : '집하 트럭이 이 좌표로 와서 파렛트를 싣습니다. 경로를 짤 때 이 위치를 씁니다.'}
          </div>
          <PackhouseForm
            productOptions={view.product_options}
            onCreated={packhouse => setCreated({ packhouse, first: !ready })}
          />
        </section>
      )}
    </div>
  );
}
