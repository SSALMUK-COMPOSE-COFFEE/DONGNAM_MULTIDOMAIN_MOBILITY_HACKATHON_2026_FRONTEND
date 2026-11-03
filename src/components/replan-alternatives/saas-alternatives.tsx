import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';

import { ContainerLoadBar } from '@/components/container-load-bar';
import { DomainChain, type VoyagePickupT } from '@/components/domain-chain';
import {
  TONE_CLASS,
  burdenWords,
  costDeltaWords,
  manwonShort,
  settlementWords,
  signedPercent,
  wonAbs,
} from '@/components/replan-alternatives/money-words';
import { ReplanExplanation } from '@/components/replan-explanation';
import type { AlternativeIdT, AlternativeT, PlanT, ReplanResponseT, ScenarioT } from '@/types/api';
import { formatPercent } from '@/utils/format';
import { getShipperShortName } from '@/utils/scenario';

export type ReplanCurrentT = {
  plan: PlanT;
  routes: VoyagePickupT[];
};

type ShipperDeltaT = AlternativeT['diff']['shippers'][number];
type CancellationT = NonNullable<AlternativeT['diff']['cancellation']>;

type SaasReplanAlternativesPropsT = {
  replan: ReplanResponseT;
  scenario: ScenarioT;
  focusContainerId: string | null;
  appliedId: AlternativeIdT | null;
  applyingId: AlternativeIdT | null;
  onApply: (alternativeId: AlternativeIdT) => void;
  costDeltaLabel: string;
  baselineAlternativeId: AlternativeIdT | null;
  current: ReplanCurrentT | null;
};

const summarizeReasons = (reasons: string[]) => [
  ...new Set(reasons.map(reason => reason.replace(/^lot-[^:]+:\s*/, ''))),
];

const hasShareChange = ({
  share_per_pallet_before: before,
  share_per_pallet_after: after,
}: ShipperDeltaT) => before > 0 && after > 0 && before !== after;

const isAffected = (shipper: ShipperDeltaT) =>
  shipper.cost_delta !== 0 ||
  (shipper.cancellation_adjustment ?? 0) !== 0 ||
  hasShareChange(shipper);

export function SaasReplanAlternatives({
  replan,
  scenario,
  focusContainerId,
  appliedId,
  applyingId,
  onApply,
  costDeltaLabel,
  baselineAlternativeId,
  current,
}: SaasReplanAlternativesPropsT) {
  const [snapshot, setSnapshot] = useState({ replanId: replan.replan_id, current });
  if (snapshot.replanId !== replan.replan_id) {
    setSnapshot({ replanId: replan.replan_id, current });
  }
  const before = snapshot.replanId === replan.replan_id ? snapshot.current : current;
  const baselineDelta =
    replan.alternatives.find(({ id }) => id === baselineAlternativeId)?.cost_delta ?? 0;
  const feasible = replan.alternatives.filter(alternative => alternative.feasible);
  const cheapest = feasible.reduce<AlternativeT | null>(
    (best, alternative) => (!best || alternative.cost_delta < best.cost_delta ? alternative : best),
    null
  );
  const cheapestId = feasible.length > 1 ? (cheapest?.id ?? null) : null;

  return (
    <div className="@container flex flex-col gap-4">
      <ReplanExplanation replan={replan} scenario={scenario} />

      <div className="grid grid-cols-1 items-stretch gap-4 @min-[1080px]:grid-cols-3">
        {replan.alternatives.map(alternative => (
          <SaasAlternativeCard
            key={alternative.id}
            alternative={alternative}
            scenario={scenario}
            focusContainerId={focusContainerId}
            current={before}
            isRecommended={alternative.feasible && alternative.id === replan.recommended_id}
            isCheapest={alternative.id === cheapestId}
            isApplied={alternative.id === appliedId}
            isApplying={alternative.id === applyingId}
            isLocked={!!appliedId || !!applyingId}
            costDeltaLabel={costDeltaLabel}
            costDelta={alternative.cost_delta - baselineDelta}
            onApply={() => onApply(alternative.id)}
          />
        ))}
      </div>
    </div>
  );
}

type SaasAlternativeCardPropsT = {
  alternative: AlternativeT;
  scenario: ScenarioT;
  focusContainerId: string | null;
  current: ReplanCurrentT | null;
  isRecommended: boolean;
  isCheapest: boolean;
  isApplied: boolean;
  isApplying: boolean;
  isLocked: boolean;
  costDeltaLabel: string;
  costDelta: number;
  onApply: () => void;
};

function SaasAlternativeCard({
  alternative,
  scenario,
  focusContainerId,
  current,
  isRecommended,
  isCheapest,
  isApplied,
  isApplying,
  isLocked,
  costDeltaLabel,
  costDelta,
  onApply,
}: SaasAlternativeCardPropsT) {
  const { label, summary, feasible, infeasible_reasons: reasons, plan, diff } = alternative;
  const container = plan.containers.find(({ container_id }) => container_id === focusContainerId);
  const affected = diff.shippers.filter(isAffected);
  const cancellation = diff.cancellation?.fee ? diff.cancellation : null;
  const cost = costDeltaWords(costDelta);
  const applyLabel =
    (!feasible && '실행 불가') ||
    (isApplied && '적용됨') ||
    (isApplying && '적용 중') ||
    '이 안으로 적용';

  return (
    <article
      className={cn(
        'm2-card flex flex-col gap-4',
        isRecommended && 'ring-2 ring-m2-brand',
        !feasible && 'bg-m2-line'
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 className={cn('m2-h2', !feasible && 'text-m2-muted')}>{label}</h3>
        {isRecommended && <span className="m2-chip m2-chip-brand">추천</span>}
        {isCheapest && feasible && <span className="m2-chip m2-chip-ok">최저 비용</span>}
        {!feasible && <span className="m2-chip m2-chip-berry">실행 불가 · 비교 제외</span>}
      </header>

      {!feasible && (
        <div className="m2-note m2-note-warn mt-0 flex-col gap-1">
          <p className="font-semibold">실행할 수 없는 이유</p>
          {summarizeReasons(reasons).map(reason => (
            <p key={reason}>{reason}</p>
          ))}
          {reasons.length === 0 && <p>제약 조건을 맞추지 못했습니다.</p>}
        </div>
      )}

      <div className={cn('flex flex-1 flex-col gap-4', !feasible && 'opacity-55')}>
        <div>
          <p className="m2-lbl">{costDeltaLabel}</p>
          {feasible ? (
            <p className={cn('m2-num text-[26px] font-bold', TONE_CLASS[cost.tone])}>{cost.text}</p>
          ) : (
            <p className="text-[26px] font-bold text-m2-muted">비교 제외</p>
          )}
          {summary && <p className="m2-sub">{summary}</p>}
        </div>

        {container && <ContainerLoadBar container={container} plan={plan} scenario={scenario} />}

        <DomainChain
          alternative={alternative}
          scenario={scenario}
          currentPlan={current?.plan ?? null}
          currentRoutes={current?.routes ?? null}
          focusContainerId={focusContainerId}
        />

        {feasible && cancellation && (
          <CancellationSummary cancellation={cancellation} scenario={scenario} />
        )}

        {feasible && affected.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="m2-h3">화주별 변화</h4>
            <ul className="flex flex-col gap-2">
              {affected.map(shipper => (
                <ShipperRow key={shipper.shipper_id} shipper={shipper} scenario={scenario} />
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="button"
        className={cn('m2-btn mt-auto w-full', isRecommended ? 'm2-btn-pri' : 'm2-btn-sec')}
        disabled={!feasible || isLocked}
        onClick={onApply}
      >
        {isApplied && <CheckIcon size={16} />}
        {applyLabel}
      </button>
    </article>
  );
}

function ShipperRow({ shipper, scenario }: { shipper: ShipperDeltaT; scenario: ScenarioT }) {
  const {
    shipper_id: shipperId,
    cost_delta: costDelta,
    share_per_pallet_before: shareBefore,
    share_per_pallet_after: shareAfter,
    share_per_pallet_delta_pct: sharePct,
  } = shipper;
  const adjustment = shipper.cancellation_adjustment ?? 0;
  const burden = burdenWords(costDelta);
  const settlement = settlementWords(adjustment);
  const net = burdenWords(costDelta + adjustment);
  const pct = sharePct ?? ((shareAfter - shareBefore) / shareBefore) * 100;

  return (
    <li className="flex flex-col gap-0.5 border-t border-m2-line pt-2 text-[12.5px] first:border-t-0 first:pt-0">
      <p className="font-semibold text-m2-ink">{getShipperShortName(scenario, shipperId)}</p>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5">
        <span className="text-m2-muted">운송비</span>
        <span className={cn('m2-num', TONE_CLASS[burden.tone])}>{burden.text}</span>
        {settlement && (
          <>
            <span className="text-m2-muted">취소 정산</span>
            <span className={cn('m2-num', TONE_CLASS[settlement.tone])}>{settlement.text}</span>
          </>
        )}
        {settlement && costDelta !== 0 && (
          <>
            <span className="text-m2-muted">합계</span>
            <span className={cn('m2-num font-semibold', TONE_CLASS[net.tone])}>{net.text}</span>
          </>
        )}
        {hasShareChange(shipper) && (
          <>
            <span className="text-m2-muted">컨테이너 파렛트당 몫</span>
            <span className="m2-num">
              {manwonShort(shareBefore)} → {manwonShort(shareAfter)} ({signedPercent(pct)})
            </span>
          </>
        )}
      </div>
    </li>
  );
}

function CancellationSummary({
  cancellation,
  scenario,
}: {
  cancellation: CancellationT;
  scenario: ScenarioT;
}) {
  const {
    payer_shipper_id: payerId,
    cancelled_pallets: cancelledPallets,
    dead_pallets: deadPallets,
    fee,
    fee_rate: feeRate,
    transfers,
  } = cancellation;

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-m2-line bg-white/60 p-3 text-[12.5px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="m2-h3">취소 부담금</h4>
        <span className="m2-num text-[11.5px] text-m2-faint">
          취소 {cancelledPallets}파렛트 · 빈칸 {deadPallets} · 부담률 {formatPercent(feeRate, 0)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="m2-lbl">내는 부담금</span>
          <p>
            <span className="font-semibold">{getShipperShortName(scenario, payerId)}</span>{' '}
            <span className="m2-num text-m2-berry-ink">{wonAbs(fee)}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="m2-lbl">받는 보전금</span>
          {transfers.length === 0 && <p className="text-m2-faint">받는 화주 없음</p>}
          {transfers.map(({ shipper_id, amount }) => (
            <p key={shipper_id}>
              <span className="font-semibold">{getShipperShortName(scenario, shipper_id)}</span>{' '}
              <span className="m2-num text-m2-ok-ink">보전 {wonAbs(amount)}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
