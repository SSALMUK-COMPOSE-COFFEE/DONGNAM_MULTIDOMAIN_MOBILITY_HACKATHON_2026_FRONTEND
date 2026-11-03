'use client';

import {
  type ReplanCandidateEventT,
  type ReplanCandidateT,
  usePlatformConfirmation,
} from '@/apis/saas/platform-confirm';
import {
  kstDayTime,
  productOf,
  productShortName,
} from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { REPLAN_CANDIDATES_ID } from '@/app/(saas)/app/platform/plans/detail/_components/replan-gate';
import type { PlanEventT } from '@/types/api';
import type { SaasPlanSessionT } from '@/types/api-saas';
import { formatKstMonthDayTime } from '@/utils/kst';
import { getShipperShortName } from '@/utils/scenario';

type ReplanCandidatesCardPropsT = {
  session: SaasPlanSessionT;
  isReplanning: boolean;
  onRun: (event: PlanEventT, label: string, focusContainerId: string | null) => void;
};

const REQUEST_KIND_LABEL: Record<NonNullable<ReplanCandidateT['request_kind']>, string> = {
  booking_amendment: '부킹 변경',
  booking_cancel: '부킹 취소',
  booking_new: '신규 부킹',
  reefer_plug: '리퍼 플러그',
  cy_entry: 'CY 반입',
  air_booking: '항공 예약',
  air_cancel: '항공 취소',
};

type LotLikeT = { shipper_id: string; product_id: string; pallets: number };

const lotSummary = (session: SaasPlanSessionT, lot: LotLikeT) => {
  const { scenario } = session;

  return `${getShipperShortName(scenario, lot.shipper_id)} ${productShortName(
    productOf(scenario, lot.product_id),
    '출하'
  )} ${lot.pallets}파렛트`;
};

const lotText = (session: SaasPlanSessionT, lotId: string) => {
  const lot = session.scenario.lots.find(({ id }) => id === lotId);

  return lot ? lotSummary(session, lot) : '출하';
};

const vesselText = (session: SaasPlanSessionT, voyageId: string) =>
  session.scenario.voyages.find(({ id }) => id === voyageId)?.vessel_name ?? '배정 항차';

const eventLabel = (session: SaasPlanSessionT, event: ReplanCandidateEventT) => {
  if (event.type === 'cancel') return `${lotText(session, event.lot_id)} 취소`;
  if (event.type === 'reduce') {
    return `${lotText(session, event.lot_id)} → ${event.new_pallets}파렛트로 감축`;
  }
  if (event.type === 'air_switch') return `${lotText(session, event.lot_id)} 항공 전환`;
  if (event.type === 'delay') {
    return `${vesselText(session, event.voyage_id)} 출항 ${kstDayTime(event.new_etd)}로 변경`;
  }

  return `${lotSummary(session, event.lot)} 추가`;
};

const focusOf = (session: SaasPlanSessionT, candidate: ReplanCandidateT) => {
  if (candidate.container_id) return candidate.container_id;
  const lotIds = new Set(candidate.lot_ids ?? []);

  return (
    session.plan.assignments.find(({ lot_id, container_id }) => lotIds.has(lot_id) && container_id)
      ?.container_id ?? null
  );
};

const candidateTitle = (session: SaasPlanSessionT, candidate: ReplanCandidateT) => {
  if (candidate.source === 'shipper_rejected') {
    const name = candidate.shipper_id
      ? getShipperShortName(session.scenario, candidate.shipper_id)
      : '화주';

    return `${name} 계획 거절`;
  }
  const kind = candidate.request_kind ? REQUEST_KIND_LABEL[candidate.request_kind] : '요청';

  return `${candidate.counterparty ?? '제3자'} ${kind} 거절`;
};

export function ReplanCandidatesCard({ session, isReplanning, onRun }: ReplanCandidatesCardPropsT) {
  const query = usePlatformConfirmation(session.plan_id);

  if (query.isError) {
    return (
      <QueryError
        error={query.error}
        subject="재계획 후보를"
        onRetry={() => query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }
  if (!query.data || !query.data.needs_replan) return null;

  const { confirmations, replan_candidates: candidates } = query.data;
  const reasonOf = (shipperId: string | null | undefined) =>
    confirmations.find(
      ({ shipper_id, status }) => shipper_id === shipperId && status === 'rejected'
    )?.reason ?? null;

  return (
    <section
      id={REPLAN_CANDIDATES_ID}
      className="m2-card flex scroll-mt-4 flex-col gap-3"
      aria-label="재계획 후보"
    >
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">재계획이 필요합니다</h2>
          <p className="m2-sub">
            화주 거절이나 선사·터미널 거절로 지금 계획을 그대로 실행할 수 없습니다. 후보 이벤트를
            누르면 아래에서 세 가지 안을 다시 계산합니다.
          </p>
        </div>
        <span className="m2-chip m2-chip-berry">재계획 필요</span>
      </div>

      {candidates.length === 0 ? (
        <p className="m2-sub mt-0">
          자동 후보가 없습니다. 아래 재최적화에서 바꿀 일을 직접 골라 다시 짜세요.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 @min-[900px]:grid-cols-2">
          {candidates.map(candidate => {
            const reason =
              candidate.source === 'shipper_rejected'
                ? reasonOf(candidate.shipper_id)
                : (candidate.note ?? null);
            const events = candidate.events ?? [];
            const focus = focusOf(session, candidate);

            return (
              <article key={candidate.id} className="m2-block flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="text-[14px]">{candidateTitle(session, candidate)}</b>
                  <span className="m2-num text-[11.5px] text-m2-muted">
                    {formatKstMonthDayTime(candidate.created_at)}
                  </span>
                </div>
                {reason ? (
                  <p className="m2-note m2-note-warn mt-0 text-[12.5px]">사유: {reason}</p>
                ) : null}
                {(candidate.lot_ids ?? []).length > 0 ? (
                  <p className="m2-sub mt-0 text-[12px] break-words">
                    대상: {(candidate.lot_ids ?? []).map(id => lotText(session, id)).join(', ')}
                  </p>
                ) : null}
                {candidate.source === 'shipper_rejected' && events.length > 0 ? (
                  <p className="m2-sub mt-0 text-[12px]">
                    거절한 화주를 빼는 다른 길입니다. &lsquo;거절한 화주 빼고 다시 짜기&rsquo;가
                    확정된 실행 지시 때문에 막힐 때 이 안으로 빼면 취소 부담금은 면제됩니다.
                  </p>
                ) : null}
                {events.length === 0 ? (
                  <p className="m2-sub mt-0 text-[12px]">계산할 이벤트가 없습니다.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {events.map((event, index) => {
                      const label = eventLabel(session, event);

                      return (
                        <button
                          key={`${candidate.id}:${index}`}
                          type="button"
                          className="m2-btn m2-btn-sec m2-btn-sm h-auto min-h-8 justify-start py-1.5 text-left whitespace-normal"
                          disabled={isReplanning}
                          onClick={() => onRun(event, `재계획 후보 · ${label}`, focus)}
                        >
                          {label} · 다시 짜기
                        </button>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
