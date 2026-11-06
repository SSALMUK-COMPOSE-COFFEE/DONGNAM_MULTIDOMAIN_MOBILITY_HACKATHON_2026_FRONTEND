'use client';

import type { ReactNode } from 'react';

import { useForwarderRefillState } from '@/apis/saas/quantity-reservations';
import { quantityTimestamp } from '@/app/(saas)/app/forwarder/voyages/_components/quantity-display';
import { CardSkeleton, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import type { RefillOfferT } from '@/types/saas-quantity';

const OFFER_STATUS: Record<RefillOfferT['status'], string> = {
  pending: '응답 대기',
  pending_execution: '수락 · 확정 대기',
  committed: '보충 확정',
  rejected: '거절',
  expired: '응답 기한 만료',
  failed: '확정 실패',
};

export function VoyageOfferLog({ planId, voyageId }: { planId: string; voyageId: string }) {
  const query = useForwarderRefillState(planId);
  const offers = query.data?.offers.filter(offer => offer.voyage_id === voyageId) ?? [];

  return (
    <section className="m2-card min-w-0">
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">보충 제안 이력</h2>
          <p className="m2-sub">
            제안 생성 시각과 화주의 응답·확정 상태를 확인하세요. 모든 시각은 KST입니다.
          </p>
        </div>
      </div>
      {query.isPending ? <CardSkeleton height={160} /> : null}
      {query.isError ? (
        <QueryError
          message="보충 제안 이력을 불러오지 못했습니다."
          onRetry={() => query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : null}
      {query.isSuccess && !offers.length ? (
        <p className="m2-sub">이 항차에 생성된 보충 제안이 없습니다.</p>
      ) : null}
      <div className="grid min-w-0 gap-3">
        {offers.map(offer => (
          <article key={offer.offer_id} className="min-w-0 rounded-xl border border-m2-line p-4">
            <div className="mb-3 flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold break-words">
                  {offer.shipper_org_name ?? offer.shipper_org_id}
                </h3>
                <p className="mt-1 text-xs break-all text-m2-muted">출하 {offer.lot_id}</p>
              </div>
              <span className="m2-chip">{OFFER_STATUS[offer.status]}</span>
            </div>
            <dl className="grid min-w-0 gap-3 text-sm min-[600px]:grid-cols-2">
              <LogLine label="제안 수량">
                {offer.offered_quantity.toLocaleString('ko-KR')}파렛트
              </LogLine>
              <LogLine label="수락 수량">
                {offer.accepted_quantity.toLocaleString('ko-KR')}파렛트
              </LogLine>
              <LogLine label="제안 생성">{quantityTimestamp(offer.created_at)}</LogLine>
              <LogLine label="응답 마감">{quantityTimestamp(offer.expires_at)}</LogLine>
              <LogLine label="응답·변경 시각">{quantityTimestamp(offer.decided_at)}</LogLine>
              <LogLine label="제안 대상">
                {offer.source === 'waitlist' ? '보충 대기 출하' : '등록된 출하'}
              </LogLine>
              <LogLine label="컨테이너">{offer.container_id}</LogLine>
              {typeof offer.detour_minutes === 'number' ? (
                <LogLine label="집하 경로 추가 소요">
                  {offer.detour_minutes.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}분
                </LogLine>
              ) : null}
            </dl>
            {offer.reason ? <p className="m2-sub mt-3 break-words">{offer.reason}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function LogLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-m2-muted">{label}</dt>
      <dd className="mt-1 break-words" style={{ overflowWrap: 'anywhere' }}>
        {children}
      </dd>
    </div>
  );
}
