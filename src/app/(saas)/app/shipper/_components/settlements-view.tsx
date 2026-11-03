'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import { useShipperSettlements } from '@/apis/saas/shipper';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import {
  fmtCount,
  fmtMonthDayTime,
  fmtWon,
} from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import type { ShipperSettlementT } from '@/types/saas-shipper';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

const BASIS_LABEL: Record<ShipperSettlementT['basis'], string> = {
  tariff: '정산표 단가',
  operational: '운영비 기준',
  mixed: '혼합',
};

const sumOf = (rows: ShipperSettlementT[], pick: (row: ShipperSettlementT) => number) =>
  rows.reduce((sum, row) => sum + pick(row), 0);

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="m2-card">
      <div className="m2-lbl">{label}</div>
      <div
        className="m2-num mt-1.5 text-[26px] leading-tight font-bold tracking-[-0.02em]"
        style={tone ? { color: tone } : {}}
      >
        {fmtCount(Math.round(value))}
        <small className="ml-0.5 text-[14px] font-semibold text-m2-ink-2">원</small>
      </div>
    </div>
  );
}

export function SettlementsView() {
  const settlements = useShipperSettlements();

  if (settlements.isError) {
    return (
      <QueryError
        message="정산 내역을 불러오지 못했습니다."
        onRetry={() => settlements.refetch()}
        isRetrying={settlements.isFetching}
      />
    );
  }
  if (settlements.isPending) return <CardSkeleton height={360} />;

  const rows = settlements.data;

  if (rows.length === 0) {
    return (
      <div className="m2-card">
        <EmptyState
          title="아직 정산할 계획이 없습니다"
          description="공동적재 계획에 출하가 들어가면 아낀 금액과 수수료가 여기에 쌓입니다."
          action={{ href: SHIPPER_PATHS.PLANS, label: '계획 확인' }}
        />
      </div>
    );
  }

  const totalSavings = sumOf(rows, ({ savings }) => savings);
  const totalFee = sumOf(rows, ({ fee }) => fee);
  const totalGain = sumOf(rows, ({ shipper_gain }) => shipper_gain);
  const totalRefund = sumOf(rows, ({ quality_refund }) => quality_refund);

  return (
    <div className="flex flex-col gap-4">
      <div className="m2-grid grid-cols-4 max-[1180px]:grid-cols-2">
        <Stat label="내 절감 합계" value={totalSavings} tone="var(--m2-ok-ink)" />
        <Stat label="수수료" value={totalFee} />
        <Stat label="내 몫" value={totalGain} tone="var(--m2-navy)" />
        <Stat label="품질 환급" value={totalRefund} />
      </div>

      <section className="m2-card" aria-label="계획별 정산">
        <div className="m2-card-h">
          <h2 className="m2-h2">계획별 정산</h2>
          <span className="m2-sub mt-0">원</span>
        </div>
        <div className="overflow-x-auto">
          <table className="m2-table">
            <thead>
              <tr>
                <th>선박 · 출항</th>
                <th>근거</th>
                <th className="r">해상 / 항공 팔레트</th>
                <th className="r">혼자 항공</th>
                <th className="r">공동적재</th>
                <th className="r">절감</th>
                <th className="r">수수료</th>
                <th className="r">품질 환급</th>
                <th className="r">내 몫</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={`${row.plan_id}:${row.shipper_id}`}>
                  <td>
                    <div className="m2-who">
                      {row.vessel ?? NO_VESSEL_LABEL}
                      <small className="m2-num">
                        출항 {fmtMonthDayTime(row.departure)} · v{row.version}
                      </small>
                    </div>
                  </td>
                  <td>
                    <span className="m2-chip">{BASIS_LABEL[row.basis]}</span>
                  </td>
                  <td className="r m2-num">
                    {row.sea_pallets} / {row.air_pallets}
                  </td>
                  <td className="r m2-num text-m2-muted">{fmtWon(row.baseline_cost)}</td>
                  <td className="r m2-num">{fmtWon(row.shared_cost)}</td>
                  <td className="r m2-num font-semibold text-m2-ok-ink">{fmtWon(row.savings)}</td>
                  <td className="r m2-num">{fmtWon(row.fee)}</td>
                  <td className="r m2-num">{fmtWon(row.quality_refund)}</td>
                  <td className="r m2-num font-semibold">{fmtWon(row.shipper_gain)}</td>
                  <td className="r">
                    <Link
                      href={SHIPPER_PATHS.PLAN(row.plan_id)}
                      className="m2-btn m2-btn-sec m2-btn-sm"
                    >
                      계획
                      <ArrowRightIcon size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
