'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';

import { useShipperProfile, useUpdateShipperProfile } from '@/apis/saas/shipper-profile';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import type { PackhouseT } from '@/types/saas-shipper';

const PackhouseMap = dynamic(
  () => import('@/app/(saas)/app/shipper/onboarding/_components/packhouse-map'),
  { ssr: false }
);
const PAGE_SIZE = 8;

export function OnboardingView() {
  const addedId = useSearchParams().get('added');
  return <PackhouseDirectory key={addedId ?? 'directory'} addedId={addedId} />;
}

function PackhouseDirectory({ addedId }: { addedId: string | null }) {
  const profile = useShipperProfile();
  const updateProfile = useUpdateShipperProfile();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<PackhouseT | null>(null);
  const mapRef = useRef<HTMLElement>(null);

  if (profile.isError)
    return (
      <QueryError
        message="출하 장소 목록을 불러오지 못했습니다."
        onRetry={() => profile.refetch()}
        isRetrying={profile.isFetching}
      />
    );
  if (profile.isPending) return <CardSkeleton height={520} />;

  const view = profile.data;
  const defaultId = view.profile?.packhouse_id;
  const filtered = view.packhouses.filter(item =>
    `${item.name} ${item.region}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );
  const ordered = [...filtered].sort((a, b) => {
    const rank = (item: PackhouseT) => {
      if (item.packhouse_id === addedId) return 0;
      if (item.packhouse_id === defaultId) return 1;
      return 2;
    };
    return rank(a) - rank(b);
  });
  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = ordered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const located = visible.find(item => item.packhouse_id === selected?.packhouse_id)
    ? selected
    : (visible[0] ?? null);
  const added = view.packhouses.find(item => item.packhouse_id === addedId);
  const products = (view.profile?.product_ids ?? []).map(
    id =>
      view.product_options.find(item => item.product_id === id)?.name.replace(/SO2/g, 'SO₂') ?? id
  );

  const locate = (packhouse: PackhouseT) => {
    setSelected({ ...packhouse });
    mapRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };

  return (
    <>
      <ShipperPageHeader
        eyebrow="화주"
        title="출하 장소 관리"
        sub={`등록된 출하 장소 ${view.packhouses.length}곳`}
      >
        {view.ready && (
          <Link href={SHIPPER_PATHS.LOTS} className="m2-btn m2-btn-sec">
            출하 등록
          </Link>
        )}
        {!view.sandbox && (
          <Link href={SHIPPER_PATHS.ADD_PACKHOUSE} className="m2-btn m2-btn-pri">
            출하 장소 추가
          </Link>
        )}
      </ShipperPageHeader>
      {added && (
        <p role="status" className="m2-note mb-4">
          {added.name} 등록을 완료했습니다.
          {added.packhouse_id !== defaultId
            ? ' 이곳에서 집하하려면 기본 출하 장소로 지정하세요.'
            : ' 출하를 등록할 수 있습니다.'}
        </p>
      )}
      {view.packhouses.length === 0 ? (
        <EmptyState
          title="등록된 출하 장소가 없습니다"
          description="화물을 집하할 출하 장소를 먼저 등록하세요."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="m2-field mb-0 w-full min-[700px]:max-w-sm">
              <label htmlFor="packhouse-search">출하 장소 검색</label>
              <input
                id="packhouse-search"
                type="search"
                className="m2-inp w-full"
                placeholder="출하 장소 이름 또는 주소"
                value={query}
                onChange={event => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
              />
            </div>
            {products.length > 0 && <p className="m2-sub">취급 품목 · {products.join(', ')}</p>}
          </div>
          {ordered.length === 0 ? (
            <EmptyState title="검색 결과가 없습니다" description="다른 이름이나 주소로 검색하세요.">
              <button type="button" className="m2-btn m2-btn-sec" onClick={() => setQuery('')}>
                검색 초기화
              </button>
            </EmptyState>
          ) : (
            <div className="grid items-start gap-4 min-[1200px]:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)]">
              <section className="m2-card" aria-label="등록된 출하 장소 목록">
                <div className="m2-card-h">
                  <h2 className="m2-h2">등록된 출하 장소</h2>
                  <span className="m2-sub" aria-live="polite">
                    {ordered.length}곳
                  </span>
                </div>
                <ul className="space-y-3">
                  {visible.map(packhouse => (
                    <li
                      key={packhouse.packhouse_id}
                      className={`relative flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors ${
                        located?.packhouse_id === packhouse.packhouse_id
                          ? 'border-m2-brand bg-m2-brand-soft'
                          : 'border-m2-line-2 bg-white hover:border-m2-brand hover:bg-m2-brand-soft/40'
                      }`}
                    >
                      <button
                        type="button"
                        className="absolute inset-0 cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m2-brand"
                        aria-label={`${packhouse.name} 지도에서 보기`}
                        aria-pressed={located?.packhouse_id === packhouse.packhouse_id}
                        onClick={() => locate(packhouse)}
                      />
                      <div className="pointer-events-none min-w-0 flex-1">
                        <h3 className="text-sm font-bold break-words text-m2-brand-ink">
                          {packhouse.name}
                        </h3>
                        <p className="m2-sub mt-1 break-words">{packhouse.region}</p>
                      </div>
                      {packhouse.packhouse_id === defaultId ? (
                        <span className="m2-chip m2-chip-brand pointer-events-none">
                          기본 출하 장소
                        </span>
                      ) : (
                        !view.sandbox &&
                        view.profile && (
                          <button
                            type="button"
                            className="m2-btn m2-btn-sec m2-btn-sm relative"
                            disabled={updateProfile.isPending}
                            aria-label={`${packhouse.name} 기본 출하 장소로 지정`}
                            onClick={event => {
                              event.stopPropagation();
                              updateProfile.mutate({ packhouse_id: packhouse.packhouse_id });
                            }}
                          >
                            {updateProfile.isPending &&
                            updateProfile.variables?.packhouse_id === packhouse.packhouse_id
                              ? '지정 중'
                              : '기본으로 지정'}
                          </button>
                        )
                      )}
                    </li>
                  ))}
                </ul>
                {pageCount > 1 && (
                  <nav
                    aria-label="출하 장소 목록 페이지"
                    className="mt-3 flex items-center justify-between gap-3 border-t border-m2-line pt-3"
                  >
                    <button
                      type="button"
                      className="m2-btn m2-btn-sec m2-btn-sm"
                      disabled={currentPage === 0}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      이전
                    </button>
                    <span className="m2-sub" aria-live="polite">
                      {currentPage + 1} / {pageCount}
                    </span>
                    <button
                      type="button"
                      className="m2-btn m2-btn-sec m2-btn-sm"
                      disabled={currentPage + 1 === pageCount}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      다음
                    </button>
                  </nav>
                )}
              </section>
              {located && (
                <section
                  ref={mapRef}
                  className="m2-card min-w-0 min-[1200px]:sticky min-[1200px]:top-0"
                  aria-label="출하 장소 위치 지도"
                >
                  <h2 className="m2-h2" aria-live="polite">
                    {located.name}
                  </h2>
                  <p className="m2-sub mb-3">{located.region}</p>
                  <PackhouseMap value={located} focusTarget={located} markerLabel={located.name} />
                  <p className="m2-sub mt-3">
                    위도 {located.lat.toFixed(4)} · 경도 {located.lon.toFixed(4)}
                  </p>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
