'use client';

import { cn } from 'cn';

import { useLearnedLossRates } from '@/apis/saas/platform-analysis';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { portName, so2Text } from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import type { ScenarioT } from '@/types/api';
import type { LossTableT } from '@/types/saas-analysis';

type LossCellT = LossTableT['cells'][number];

const MODE_LABEL: Record<LossCellT['mode'], string> = { sea: '해상', air: '항공' };

const ORIGIN_LABEL: Record<string, string> = {
  seed: '시드',
  arrival: '도착 검수',
  manual: '수동',
};

const pct = (rate: number | null) =>
  rate === null || !Number.isFinite(rate) ? '–' : `${(rate * 100).toFixed(2)}%`;

const deltaText = (delta: number) => {
  const points = delta * 100;
  if (Math.abs(points) < 0.005) return '변화 없음';

  return `${points > 0 ? '+' : ''}${points.toFixed(2)}%p`;
};

const originsText = (origins: LossCellT['origins']) =>
  Object.entries(origins)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${ORIGIN_LABEL[key] ?? key} ${count}`)
    .join(' · ');

export function LearnedLossCard({ scenario }: { scenario: ScenarioT }) {
  const { data, isPending, isError, error, refetch, isFetching } = useLearnedLossRates();

  return (
    <section className="m2-card" aria-busy={isPending}>
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">학습 손실률</h2>
          <p className="m2-sub">
            사전 손실률에 도착 검수 관측을 파렛트 가중으로 더해 다음 계획의 손실 가정을 고칩니다.
          </p>
        </div>
        {data ? <span className="m2-chip m2-num">관측 n = {data.total_observations}</span> : null}
      </div>
      {isPending ? <Skeleton className="h-56 rounded-[14px]" /> : null}
      {isError ? (
        <QueryError
          error={error}
          subject="학습 손실률을"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : null}
      {data && data.cells.length === 0 ? (
        <EmptyState compact title="학습할 품목 칸이 없습니다" />
      ) : null}
      {data && data.cells.length > 0 ? <LossTable table={data} scenario={scenario} /> : null}
    </section>
  );
}

function LossTable({ table, scenario }: { table: LossTableT; scenario: ScenarioT }) {
  return (
    <>
      <div className="-mx-2.5 overflow-x-auto px-2.5">
        <table className="m2-table">
          <thead>
            <tr>
              <th>품목 · 경로</th>
              <th className="r">관측 n</th>
              <th className="r">사전 → 학습</th>
              <th className="r">범위</th>
            </tr>
          </thead>
          <tbody>
            {table.cells.map(cell => (
              <tr key={`${cell.product_id}:${cell.destination}:${cell.mode}`} title={cell.basis}>
                <td className="whitespace-normal">
                  <div className="m2-who">
                    {so2Text(cell.product_name)}
                    <small>
                      {MODE_LABEL[cell.mode]} · {portName(scenario, cell.destination)}
                    </small>
                  </div>
                </td>
                <td className="r m2-num">
                  <div className="font-bold">{cell.observations}건</div>
                  <div className="text-[11.5px] text-m2-muted">
                    {cell.pallets}파렛트
                    {originsText(cell.origins) ? ` · ${originsText(cell.origins)}` : ''}
                  </div>
                </td>
                <td className="r m2-num">
                  <div className="text-[12px] text-m2-muted">{pct(cell.prior_rate)}</div>
                  <div className="font-bold">{pct(cell.posterior_rate)}</div>
                  <div
                    className={cn(
                      'text-[11.5px]',
                      cell.delta > 0 ? 'text-m2-warn-ink' : 'text-m2-muted'
                    )}
                  >
                    {deltaText(cell.delta)}
                  </div>
                </td>
                <td className="r m2-num text-[12px]">
                  {pct(cell.range_low)} ~ {pct(cell.range_high)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="m2-note m2-note-warn mt-3">
        <span>{table.seed_label}</span>
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-m2-muted">
        사전 가중 {table.prior_weight_pallets}파렛트 · 범위 ±{table.range_z}σ · {table.method}
      </p>
    </>
  );
}
