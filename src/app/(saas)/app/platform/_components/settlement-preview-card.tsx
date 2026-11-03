import { cn } from 'cn';
import type { ReactNode } from 'react';

import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { feeRateOf, percentLabel, won } from '@/app/(saas)/app/platform/_components/m2-format';
import {
  type PlanSourceT,
  settlementSummary,
} from '@/app/(saas)/app/platform/_components/plan-model';
import { CompareBars } from '@/components/map-hero';
import { Skeleton } from '@/components/ui/skeleton';

type SettlementPreviewCardPropsT = {
  title: string;
  source: PlanSourceT | null;
  isPending?: boolean;
  isStale?: boolean;
  emptyText: string;
  footer?: ReactNode;
};

export function SettlementPreviewCard({
  title,
  source,
  isPending = false,
  isStale = false,
  emptyText,
  footer,
}: SettlementPreviewCardPropsT) {
  const summary = source ? settlementSummary(source, feeRateOf(source.scenario)) : null;

  return (
    <section className="m2-card" aria-busy={isPending || isStale}>
      <div className="m2-card-h">
        <h2 className="m2-h2">{title}</h2>
        <div className="flex flex-wrap justify-end gap-1.5">
          {isStale ? <span className="m2-chip m2-chip-brand">재계산 중</span> : null}
          {summary?.basisLabel ? <span className="m2-chip">{summary.basisLabel}</span> : null}
        </div>
      </div>
      {isPending ? <Skeleton className="h-40 rounded-[14px]" /> : null}
      {!isPending && !summary ? (
        <EmptyState compact title="아직 계산 전입니다" description={emptyText} />
      ) : null}
      {!isPending && summary ? (
        <div className={cn(isStale && 'opacity-60')}>
          <CompareBars
            className="m2-num"
            rows={[
              { label: '단독 발송', value: won(summary.baseline), ratio: 1, tone: 'base' },
              {
                label: '공동적재',
                value: won(summary.shared),
                ratio: summary.baseline > 0 ? summary.shared / summary.baseline : 0,
                tone: 'navy',
              },
            ]}
          />
          <div className="m2-lines">
            <div>
              <span>
                화주 몫 {summary.feeRate === null ? '' : percentLabel(1 - summary.feeRate)}
              </span>
              <b>{won(summary.gain)}</b>
            </div>
            <div>
              <span>성과보수 {summary.feeRate === null ? '' : percentLabel(summary.feeRate)}</span>
              <b>{won(summary.fee)}</b>
            </div>
            <div>
              <span>
                집하 운행비 ({summary.runs}운행 · {Math.round(summary.km).toLocaleString('ko-KR')}
                km)
              </span>
              <b>{won(summary.collectionCost)}</b>
            </div>
          </div>
          {footer}
        </div>
      ) : null}
    </section>
  );
}
