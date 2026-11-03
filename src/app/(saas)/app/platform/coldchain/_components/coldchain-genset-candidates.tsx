'use client';

import { cn } from 'cn';

import { usePowerPlan } from '@/apis/saas/coldchain';
import {
  formatMinutes,
  hourMinute,
  monthDayTime,
} from '@/app/(saas)/app/forwarder/_components/format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  GensetCandidateT,
  LotPowerPlanT,
  PowerPlanT,
  PowerSegmentT,
} from '@/types/saas-platform';

const DEFAULT_THRESHOLD_MINUTES = 60;

const GATE_STATUS: Record<NonNullable<LotPowerPlanT['gate_status']>, string> = {
  off_peak: '게이트 한산',
  peak: '게이트 혼잡',
  avoided: '혼잡 회피',
};

const SEGMENT_STAGE: Record<PowerSegmentT['stage'], string> = {
  trucking: '트럭 운송',
  gate: '게이트 대기',
  plug: '플러그 대기',
};

const thresholdOf = (plan: PowerPlanT) =>
  plan.params.pre_assign_threshold_minutes?.value ?? DEFAULT_THRESHOLD_MINUTES;

const tripText = (truckId: string | null, trip: number | null) =>
  [truckId, typeof trip === 'number' ? `${trip}회차` : ''].filter(Boolean).join(' ') || '트럭 미정';

type ColdchainGensetCandidatesPropsT = {
  planId: string;
  containerId?: string;
};

export function ColdchainGensetCandidates({
  planId,
  containerId = '',
}: ColdchainGensetCandidatesPropsT) {
  const powerPlan = usePowerPlan(planId);

  return (
    <section className="m2-card" aria-label="젯셋 사전 배정 후보">
      <div className="m2-card-h">
        <h2 className="m2-h2">젯셋 사전 배정 후보</h2>
        <span className="text-[12px] text-m2-muted">
          집하 경로의 무전원 예상 구간으로 계산한 계획 단계 제안입니다
        </span>
      </div>
      {powerPlan.isPending ? <Skeleton className="h-32 rounded-[14px]" /> : null}
      {powerPlan.isError ? (
        <QueryError
          error={powerPlan.error}
          subject="전원 계획을"
          onRetry={() => powerPlan.refetch()}
          isRetrying={powerPlan.isFetching}
        />
      ) : null}
      {powerPlan.isSuccess ? (
        <PowerPlanBody plan={powerPlan.data} containerId={containerId} />
      ) : null}
    </section>
  );
}

function PowerPlanBody({ plan, containerId }: { plan: PowerPlanT; containerId: string }) {
  const threshold = thresholdOf(plan);
  const lots = containerId ? plan.lots.filter(lot => lot.container_id === containerId) : plan.lots;

  return (
    <div className="flex flex-col gap-3.5">
      {plan.candidates.length === 0 ? (
        <p className="m2-sub">
          무전원 예상 구간이 기준({formatMinutes(threshold)}분)을 넘는 트럭이 없습니다.
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-2.5">
          {plan.candidates.map(candidate => (
            <CandidateCard
              key={candidate.key}
              candidate={candidate}
              isCurrent={!!containerId && candidate.container_ids.includes(containerId)}
            />
          ))}
        </ul>
      )}
      {lots.length > 0 ? (
        <table className="m2-table">
          <thead>
            <tr>
              <th>로트</th>
              <th>컨테이너</th>
              <th>트럭</th>
              <th>구간</th>
              <th className="r">무전원 예상</th>
              <th>판정</th>
            </tr>
          </thead>
          <tbody>
            {lots.map(lot => (
              <tr key={lot.lot_id}>
                <td className="m2-mono">{lot.lot_id}</td>
                <td className="m2-mono">{lot.container_id}</td>
                <td>
                  {tripText(lot.truck_id, lot.trip)}
                  {lot.gate_status ? (
                    <span className="m2-chip ml-1.5">{GATE_STATUS[lot.gate_status]}</span>
                  ) : null}
                </td>
                <td className="text-[12px] text-m2-muted">
                  {lot.segments.some(segment => !segment.powered)
                    ? lot.segments
                        .filter(segment => !segment.powered)
                        .map(segment => (
                          <span key={segment.stage} title={segment.basis} className="mr-2">
                            {SEGMENT_STAGE[segment.stage]} {formatMinutes(segment.minutes)}분
                          </span>
                        ))
                    : '–'}
                </td>
                <td className="r m2-num">
                  {formatMinutes(lot.unpowered_minutes)}/{formatMinutes(lot.threshold_minutes)}분
                </td>
                <td>
                  <span className={lot.exceeds ? 'm2-chip m2-chip-berry' : 'm2-chip m2-chip-ok'}>
                    {lot.exceeds ? '기준 초과' : '기준 이내'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <p className="text-[11.5px] text-m2-muted">{plan.rule}</p>
    </div>
  );
}

function CandidateCard({
  candidate,
  isCurrent,
}: {
  candidate: GensetCandidateT;
  isCurrent: boolean;
}) {
  return (
    <li
      className={cn(
        'm2-block flex flex-col gap-1.5',
        isCurrent && 'shadow-[0_0_0_2px_var(--m2-brand)]'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="m2-h3">{tripText(candidate.truck_id, candidate.trip)}</h3>
        {candidate.container_ids.map(id => (
          <span key={id} className="m2-chip m2-mono">
            {id}
          </span>
        ))}
        <span className="m2-chip m2-chip-berry ml-auto">
          {formatMinutes(candidate.unpowered_minutes)}/{formatMinutes(candidate.threshold_minutes)}
          분
        </span>
      </div>
      <p className="m2-num text-[12.5px]">
        <span className="text-m2-muted">배정 구간 </span>
        {monthDayTime(candidate.window_start)}–{hourMinute(candidate.window_end)}
      </p>
      <p className="text-[12.5px]">
        <span className="text-m2-muted">장비 </span>
        {candidate.equipment}
      </p>
      <p className="text-[12px] text-m2-ink-2">{candidate.reason}</p>
    </li>
  );
}
