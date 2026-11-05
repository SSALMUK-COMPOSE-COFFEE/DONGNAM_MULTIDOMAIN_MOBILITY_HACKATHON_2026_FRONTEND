'use client';

import Link from 'next/link';

import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import type { ResourceT } from '@/types/saas-resources';

export function PlanningResources({
  resources,
  isLoading,
  isError,
  onRetry,
}: {
  resources: readonly ResourceT[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const available = resources.filter(
    item => item.status === 'available' && item.available_pallets > 0
  );
  return (
    <section className="m2-card mb-4" aria-label="계획에 사용할 내 컨테이너">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="m2-h2">내가 제공한 공간으로 공동적재 계산</h2>
          <p className="m2-sub mt-1">
            등록한 가용 컨테이너와 항차만 사용합니다. 계획 배정은 실제 선사 부킹 완료를 뜻하지
            않습니다.
          </p>
        </div>
        <Link href={FORWARDER_PATHS.CONTAINERS} className="m2-btn m2-btn-sec m2-btn-sm">
          컨테이너 관리
        </Link>
      </div>
      {isLoading && (
        <p role="status" className="m2-sub mt-3">
          가용 자원을 불러오는 중
        </p>
      )}
      {isError && (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-m2-crit">가용 자원을 확인하지 못했습니다.</p>
          <button type="button" className="m2-btn m2-btn-sec m2-btn-sm" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      )}
      {!isLoading && !isError && available.length === 0 && (
        <p role="status" className="m2-note mt-3">
          사용할 수 있는 컨테이너가 없습니다. 컨테이너 관리에서 제공할 공간과 반입 마감 일정을
          등록하세요.
        </p>
      )}
      {!isLoading && !isError && available.length > 0 && (
        <p className="mt-3 text-sm font-semibold">
          가용 {available.length}개 · 제공 공간{' '}
          {available.reduce((sum, item) => sum + item.available_pallets, 0)}파렛트
        </p>
      )}
    </section>
  );
}
