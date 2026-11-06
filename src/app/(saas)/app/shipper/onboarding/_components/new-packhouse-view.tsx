'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useShipperProfile } from '@/apis/saas/shipper-profile';
import { CardSkeleton, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { PackhouseForm } from '@/app/(saas)/app/shipper/onboarding/_components/packhouse-form';

export function NewPackhouseView() {
  const profile = useShipperProfile();
  const router = useRouter();
  const content = () => {
    if (profile.isError)
      return (
        <QueryError
          message="화주 정보를 불러오지 못했습니다."
          onRetry={() => profile.refetch()}
          isRetrying={profile.isFetching}
        />
      );
    if (profile.isPending) return <CardSkeleton height={520} />;
    if (profile.data.sandbox)
      return (
        <p className="m2-note">데모 업체는 출하 장소가 정해져 있어 새로 등록할 수 없습니다.</p>
      );
    return (
      <section className="m2-card">
        {profile.data.ready && (
          <p className="m2-sub mb-4">
            추가한 출하 장소에서 집하하려면 등록 후 목록에서 기본 출하 장소로 지정하세요.
          </p>
        )}
        <PackhouseForm
          productOptions={profile.data.product_options}
          onCreated={packhouse =>
            router.push(
              `${SHIPPER_PATHS.ONBOARDING}?added=${encodeURIComponent(packhouse.packhouse_id)}`
            )
          }
        />
      </section>
    );
  };
  return (
    <>
      <ShipperPageHeader
        eyebrow="출하 장소 관리"
        title="출하 장소 추가"
        sub="출하 장소 정보와 집하 위치를 등록하세요."
      >
        <Link href={SHIPPER_PATHS.ONBOARDING} className="m2-btn m2-btn-sec">
          목록으로
        </Link>
      </ShipperPageHeader>
      {content()}
    </>
  );
}
