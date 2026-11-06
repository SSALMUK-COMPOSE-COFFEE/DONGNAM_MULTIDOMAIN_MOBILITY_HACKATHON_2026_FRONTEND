'use client';

import { useForwarderAirSeaCompare } from '@/apis/saas/forwarder-operations';
import { won } from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { CompareBars, type CompareRowT } from '@/components/map-hero/parts';
import { Skeleton } from '@/components/ui/skeleton';
import type { AirSeaComparisonT } from '@/types/saas-analysis';

type CostT = NonNullable<AirSeaComparisonT['sea']['cost']>;
type CostKeyT = 'freight' | 'inland' | 'collection' | 'handling' | 'storage' | 'loss_risk';

const COST_ROWS: { key: CostKeyT; label: string }[] = [
  { key: 'freight', label: '운임' },
  { key: 'inland', label: '내륙 운송' },
  { key: 'collection', label: '집하' },
  { key: 'handling', label: '하역' },
  { key: 'storage', label: '보관' },
  { key: 'loss_risk', label: '손실 위험' },
];

type AirCompareCardPropsT = {
  planId: string;
  lotId: string;
  isShortSellWindow: boolean;
};

const valueOf = (cost: CostT | null, key: CostKeyT) => (cost ? cost[key] : null);

export function AirCompareCard({ planId, lotId, isShortSellWindow }: AirCompareCardPropsT) {
  const query = useForwarderAirSeaCompare(planId, lotId);

  if (query.isPending) return <Skeleton className="h-64 w-full rounded-[14px]" />;
  if (query.isError) {
    return (
      <QueryError
        error={query.error}
        subject="해상·항공 비용 비교를"
        onRetry={() => query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const { sea, air, cheaper, sea_savings: seaSavings, pallets, kg } = query.data;
  const seaCost = sea.cost ?? null;
  const airCost = air.cost;
  const rows = COST_ROWS.filter(
    ({ key }) => (valueOf(seaCost, key) ?? 0) !== 0 || airCost[key] !== 0
  );
  const lossLabel = isShortSellWindow ? '손실·폐기 위험' : '손실 위험';
  const maxTotal = Math.max(seaCost?.total ?? 0, airCost.total);
  const bars: CompareRowT[] = [
    ...(seaCost
      ? [
          {
            label: '해상',
            value: won(seaCost.total),
            ratio: maxTotal > 0 ? seaCost.total / maxTotal : 0,
            tone: 'navy' as const,
          },
        ]
      : []),
    {
      label: '항공',
      value: won(airCost.total),
      ratio: maxTotal > 0 ? airCost.total / maxTotal : 0,
      tone: 'brand',
    },
  ];
  const gap = seaSavings === null ? null : Math.abs(seaSavings);

  return (
    <div className="m2-block flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="m2-h3">해상 vs 항공 총비용</div>
        {cheaper === 'air' && <span className="m2-chip m2-chip-ok">항공 추천</span>}
        {cheaper === 'sea' && <span className="m2-chip m2-chip-brand">해상 유지가 유리</span>}
        {cheaper === null && <span className="m2-chip">비교 불가</span>}
      </div>
      <p className="m2-sub mt-0">
        <span className="m2-num">{pallets}</span>파렛트 ·{' '}
        <span className="m2-num">{Math.round(kg).toLocaleString('ko-KR')}</span>kg 기준
        {isShortSellWindow ? ' · 판매 기간이 짧아 폐기 위험을 손실 위험에 넣었습니다' : ''}
      </p>
      <CompareBars rows={bars} />
      <div className="overflow-x-auto">
        <table className="m2-table">
          <thead>
            <tr>
              <th>항목</th>
              <th className="r">해상</th>
              <th className="r">항공</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label }) => (
              <tr key={key}>
                <td>{key === 'loss_risk' ? lossLabel : label}</td>
                <td className="r m2-num">{won(valueOf(seaCost, key))}</td>
                <td className="r m2-num">{won(airCost[key])}</td>
              </tr>
            ))}
            <tr>
              <td className="font-semibold">합계</td>
              <td className="r m2-num font-semibold">{won(seaCost?.total ?? null)}</td>
              <td className="r m2-num font-semibold">{won(airCost.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {!sea.feasible && (
        <p className="m2-note m2-note-warn mt-0">
          해상 불가: {sea.reason ?? '해상 슬롯이 없습니다'}
        </p>
      )}
      {!air.feasible && (
        <p className="m2-note m2-note-warn mt-0">항공 불가: {air.reason ?? '항공편이 없습니다'}</p>
      )}
      {cheaper === 'air' && gap !== null && (
        <p className="m2-note mt-0">항공으로 돌리면 {won(gap)} 덜 듭니다.</p>
      )}
      {cheaper === 'sea' && gap !== null && (
        <p className="m2-note mt-0">
          해상이 {won(gap)} 덜 듭니다. 전환하면 그만큼 총비용이 늘어납니다.
        </p>
      )}
    </div>
  );
}
