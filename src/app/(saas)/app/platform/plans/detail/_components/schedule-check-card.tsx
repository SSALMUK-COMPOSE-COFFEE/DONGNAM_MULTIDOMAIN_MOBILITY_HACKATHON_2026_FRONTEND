'use client';

import { useForwarderScheduleCheck } from '@/apis/saas/forwarder-operations';
import { kstDayTime } from '@/app/(saas)/app/platform/_components/m2-format';
import { hoursText } from '@/app/(saas)/app/platform/plans/detail/_components/replan-delay-tab';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlanEventT } from '@/types/api';
import type { SaasPlanSessionT } from '@/types/api-saas';

type ScheduleCheckCardPropsT = {
  session: SaasPlanSessionT;
  isReplanning: boolean;
  onRun: (event: PlanEventT, label: string, focusContainerId: string | null) => void;
};

const MATCHED_BY_LABEL: Record<string, string> = {
  call_sign: '호출부호 일치',
  vessel_name: '선박명 일치',
};

const signedHours = (hours: number) =>
  hours > 0 ? `+${hoursText(hours)}시간` : `${hoursText(hours)}시간`;

export function ScheduleCheckCard({ session, isReplanning, onRun }: ScheduleCheckCardPropsT) {
  const { plan_id: planId, plan } = session;
  const check = useForwarderScheduleCheck(planId);
  const result = check.data ?? null;
  const usedDemo = result?.demo_mixed ?? false;
  const containerOf = (voyageId: string) =>
    plan.containers.find(({ used, voyage_id }) => used && voyage_id === voyageId)?.container_id ??
    null;

  const runCheck = () => check.mutate({ demo: false });

  return (
    <section className="m2-card flex min-w-0 flex-col gap-3">
      <div>
        <h2 className="m2-h3">해수부 일정 확인</h2>
        <p className="m2-sub">
          해수부 선박입출항 부산항 출항 신고를 예정 ETD와 견줍니다. 서버가 해수부에 닿지 못하면
          저장된 스냅샷으로 확인합니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="m2-btn m2-btn-sec"
          disabled={check.isPending}
          onClick={runCheck}
        >
          {check.isPending ? '확인 중' : '해수부 일정 확인'}
        </button>
      </div>

      {check.isPending && <Skeleton className="h-24 w-full rounded-[14px]" />}

      {check.isError && (
        <p className="m2-note m2-note-warn mt-0">
          일정을 확인하지 못했습니다. 잠시 뒤 다시 눌러 주세요.
        </p>
      )}

      {result && !check.isPending && (
        <div className="flex min-w-0 flex-col gap-3">
          <div className="m2-kv">
            <span className="m2-chip">출처 {result.source}</span>
            {usedDemo ? (
              <span className="m2-chip m2-chip-warn">시연 실적 포함</span>
            ) : (
              <span className="m2-chip m2-chip-ok">실데이터</span>
            )}
            <span>
              입출항 신고 <b className="m2-num">{result.movement_count}</b>건
            </span>
            <span>확인 항차 {result.checked_voyage_ids.join(', ') || '없음'}</span>
          </div>

          {result.changes.length === 0 ? (
            <p className="m2-sub mt-0">예정 ETD와 어긋난 항차가 없습니다.</p>
          ) : (
            result.changes.map(change => {
              const event = result.events.find(({ voyage_id }) => voyage_id === change.voyage_id);
              const delta = signedHours(change.delta_hours);

              return (
                <div
                  key={`${change.voyage_id}:${change.observed_etd}`}
                  className="m2-block mt-0 flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b>
                      {change.vessel_name} · {change.voyage_id}
                    </b>
                    <span className="m2-chip m2-chip-warn">{delta}</span>
                  </div>
                  <div className="m2-lines mt-0 border-t-0 pt-0">
                    <div>
                      <span>예정 ETD</span>
                      <b>{kstDayTime(change.planned_etd)}</b>
                    </div>
                    <div>
                      <span>신고 ETD</span>
                      <b>{kstDayTime(change.observed_etd)}</b>
                    </div>
                    <div>
                      <span>근거</span>
                      <b>
                        {change.source}
                        {change.matched_by ? ` · ${MATCHED_BY_LABEL[change.matched_by]}` : ''}
                      </b>
                    </div>
                  </div>
                  {event && (
                    <button
                      type="button"
                      className="m2-btn m2-btn-pri self-start"
                      disabled={isReplanning}
                      onClick={() =>
                        onRun(
                          event,
                          `해수부 확인 · ${change.vessel_name} ${delta}`,
                          containerOf(change.voyage_id)
                        )
                      }
                    >
                      이 지연으로 3안 계산
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
