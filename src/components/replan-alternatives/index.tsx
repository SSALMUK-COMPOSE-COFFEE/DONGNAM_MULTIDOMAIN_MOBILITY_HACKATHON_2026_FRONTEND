import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';

import { ContainerLoadBar } from '@/components/container-load-bar';
import {
  type ReplanCurrentT,
  SaasReplanAlternatives,
} from '@/components/replan-alternatives/saas-alternatives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AlternativeIdT, AlternativeT, ReplanResponseT, ScenarioT } from '@/types/api';
import { formatManwon, formatSignedManwon } from '@/utils/format';
import { getShipperShortName } from '@/utils/scenario';

const LOCATION_LABEL: Record<string, string> = {
  AIR: '항공',
  UNASSIGNED: '미배정',
};
/** 'lot-jinju-sb-1: V-2611B/CA-03 도착일이 판매기한 초과' 처럼 로트마다 반복되는 사유를 한 줄로 */
const summarizeReasons = (reasons: string[]) => [
  ...new Set(reasons.map(reason => reason.replace(/^lot-[^:]+:\s*/, ''))),
];

const toLocationLabel = (location: string | null) =>
  location ? (LOCATION_LABEL[location] ?? location) : '–';

type ReplanAlternativesPropsT = {
  replan: ReplanResponseT;
  scenario: ScenarioT;
  /** 전후를 보여줄 컨테이너 (변동이 생긴 컨테이너) */
  focusContainerId: string | null;
  appliedId: AlternativeIdT | null;
  applyingId: AlternativeIdT | null;
  onApply: (alternativeId: AlternativeIdT) => void;
  /** 비용 변화의 기준 문구. 기본은 '지금 계획 대비' */
  costDeltaLabel?: string;
  /**
   * 이 대안의 총비용을 0 으로 두고 나머지를 견준다.
   * 백엔드 cost_delta 는 지금 계획 대비라서, 모든 안에 똑같이 드는 비용(예: 항공 전환 운임)이 섞여 있을 때 쓴다
   */
  baselineAlternativeId?: AlternativeIdT;
  variant?: 'demo' | 'saas';
  current?: ReplanCurrentT | null;
  applyBlockedReason?: string | null;
};

export type { ReplanCurrentT } from '@/components/replan-alternatives/saas-alternatives';

/** 재최적화 대안 3개(당겨 채우기·다음 배 이월·그대로 출항)를 비용·적재·화주 영향으로 비교한다 */
export function ReplanAlternatives({
  replan,
  scenario,
  focusContainerId,
  appliedId,
  applyingId,
  onApply,
  costDeltaLabel = '지금 계획 대비 총비용 변화',
  baselineAlternativeId,
  variant = 'demo',
  current = null,
  applyBlockedReason = null,
}: ReplanAlternativesPropsT) {
  if (variant === 'saas') {
    return (
      <SaasReplanAlternatives
        replan={replan}
        scenario={scenario}
        focusContainerId={focusContainerId}
        appliedId={appliedId}
        applyingId={applyingId}
        onApply={onApply}
        costDeltaLabel={costDeltaLabel}
        baselineAlternativeId={baselineAlternativeId ?? null}
        current={current}
        applyBlockedReason={applyBlockedReason}
      />
    );
  }

  const baselineDelta =
    replan.alternatives.find(({ id }) => id === baselineAlternativeId)?.cost_delta ?? 0;
  const recommended = replan.alternatives.find(({ id }) => id === replan.recommended_id);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg">
        세 가지 안을 다시 계산했습니다
        <span className="ml-1 num text-muted-foreground">({replan.solve_ms}ms)</span>.
        {recommended && (
          <>
            {' '}
            추천은 <span className="font-bold text-brand">{recommended.label}</span>입니다.
          </>
        )}
      </p>

      <div className="grid grid-cols-3 gap-6">
        {replan.alternatives.map(alternative => (
          <AlternativeCard
            key={alternative.id}
            alternative={alternative}
            scenario={scenario}
            focusContainerId={focusContainerId}
            isRecommended={alternative.id === replan.recommended_id}
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

type AlternativeCardPropsT = {
  alternative: AlternativeT;
  scenario: ScenarioT;
  focusContainerId: string | null;
  isRecommended: boolean;
  isApplied: boolean;
  isApplying: boolean;
  isLocked: boolean;
  costDeltaLabel: string;
  costDelta: number;
  onApply: () => void;
};

function AlternativeCard({
  alternative,
  scenario,
  focusContainerId,
  isRecommended,
  isApplied,
  isApplying,
  isLocked,
  costDeltaLabel,
  costDelta,
  onApply,
}: AlternativeCardPropsT) {
  const { label, feasible, infeasible_reasons, plan, diff } = alternative;
  const container = plan.containers.find(({ container_id }) => container_id === focusContainerId);
  const applyLabel = (isApplied && '적용됨') || (isApplying && '적용 중') || '이 안으로 적용';
  const affectedShippers = diff.shippers.filter(
    ({ cost_delta: shipperDelta, cancellation_adjustment }) =>
      shipperDelta !== 0 || (cancellation_adjustment ?? 0) !== 0
  );

  return (
    <Card className={cn(isRecommended && 'ring-2! ring-brand!', !feasible && 'bg-panel')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {label}
          {isRecommended && <Badge className="bg-brand">추천</Badge>}
          {!feasible && <Badge variant="destructive">실행 불가</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div>
          <p className="text-sm text-muted-foreground">{costDeltaLabel}</p>
          <p
            className={cn(
              'text-3xl font-bold num',
              (!feasible && 'text-muted-foreground') ||
                (costDelta === 0 && 'text-foreground') ||
                (costDelta < 0 ? 'text-ok' : 'text-berry')
            )}
          >
            {formatSignedManwon(costDelta)}
            <span className="ml-1 text-base font-medium text-muted-foreground">만 원</span>
          </p>
        </div>

        {container && <ContainerLoadBar container={container} plan={plan} scenario={scenario} />}

        <ul className="flex flex-col gap-1.5 text-sm">
          {diff.moved_lots.map(
            ({ lot_id, shipper_id, pallets, from_location, to_location, pull_forward_days }) => (
              <li key={lot_id}>
                <span className="font-bold">{getShipperShortName(scenario, shipper_id)}</span>{' '}
                <span className="num">{pallets}</span>파렛트 {toLocationLabel(from_location)} →{' '}
                <span className="font-bold text-brand">{toLocationLabel(to_location)}</span>
                {!!pull_forward_days && ` (${pull_forward_days}일 당김)`}
              </li>
            )
          )}
          {affectedShippers.map(
            ({ shipper_id, cost_delta: shipperDelta, cancellation_adjustment }) => (
              <li key={shipper_id} className="text-muted-foreground">
                {getShipperShortName(scenario, shipper_id)} 부담{' '}
                <span className="num">
                  {formatSignedManwon(shipperDelta + (cancellation_adjustment ?? 0))}만 원
                </span>
              </li>
            )
          )}
          {!!diff.cancellation?.fee && (
            <li className="font-bold text-berry">
              {getShipperShortName(scenario, diff.cancellation.payer_shipper_id)} 취소 부담금{' '}
              <span className="num">{formatManwon(diff.cancellation.fee)}만 원</span>
            </li>
          )}
          {summarizeReasons(infeasible_reasons).map(reason => (
            <li key={reason} className="text-berry">
              {reason}
            </li>
          ))}
        </ul>

        <Button
          size="lg"
          className="mt-auto"
          variant={isRecommended ? 'default' : 'outline'}
          disabled={!feasible || isLocked}
          onClick={onApply}
        >
          {isApplied && <CheckIcon />}
          {applyLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
