'use client';

import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { usePlatformSettlements } from '@/apis/saas/platform';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { won, wonNumber } from '@/app/(saas)/app/platform/_components/m2-format';
import { PLATFORM_PATHS } from '@/app/(saas)/app/platform/_components/paths';
import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { StatTile } from '@/app/(saas)/app/platform/_components/stat-tile';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlatformSettlementT } from '@/types/saas-platform';
import { formatKstMonthDayTime } from '@/utils/kst';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

const sumBy = (rows: PlatformSettlementT[], pick: (row: PlatformSettlementT) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

function SettlementShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PlatformHeader
        eyebrow="정산"
        title="화주가 아낀 돈에서만 성과보수를 받습니다"
        sub="계획별 화주 총비용 절감액과 성과보수, 화주에게 돌아간 몫입니다."
      />
      {children}
    </>
  );
}

export function SettlementView() {
  const { data, isPending, isError, error, refetch, isFetching } = usePlatformSettlements();

  if (isError) {
    return (
      <SettlementShell>
        <QueryError
          error={error}
          subject="정산 내역을"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </SettlementShell>
    );
  }
  if (isPending) {
    return (
      <SettlementShell>
        <Skeleton className="h-96 rounded-[18px]" />
      </SettlementShell>
    );
  }
  if (data.length === 0) {
    return (
      <SettlementShell>
        <EmptyState
          title="아직 정산할 계획이 없습니다"
          description="공동적재 계획을 만들면 화주별 절감액과 성과보수가 계산됩니다."
        />
      </SettlementShell>
    );
  }

  const totalSaving = sumBy(data, ({ total_saving_krw }) => total_saving_krw);
  const totalFee = sumBy(data, ({ platform_fee_krw }) => platform_fee_krw);
  const feeRatio = totalSaving > 0 ? Math.round((totalFee / totalSaving) * 100) : null;

  return (
    <SettlementShell>
      <div className="mb-4 grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
        <StatTile label="화주 총비용 절감" value={wonNumber(totalSaving)} unit="원" />
        <StatTile
          label="플랫폼 성과보수"
          value={wonNumber(totalFee)}
          unit="원"
          note={feeRatio === null ? '' : `절감액의 ${feeRatio}%`}
        />
        <StatTile label="화주에게 돌아간 몫" value={wonNumber(totalSaving - totalFee)} unit="원" />
      </div>

      <section className="m2-card">
        <div className="m2-card-h">
          <h2 className="m2-h2">계획별 정산</h2>
          <span className="m2-chip">원 단위</span>
        </div>
        <div className="-mx-2.5 overflow-x-auto px-2.5">
          <table className="m2-table">
            <thead>
              <tr>
                <th>항차 · 화주</th>
                <th>출항</th>
                <th className="r">절감</th>
                <th className="r">성과보수</th>
                <th className="r">화주 몫</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <Fragment key={row.plan_id}>
                  <tr className="font-semibold [&>td]:bg-[rgba(15,27,51,0.025)]">
                    <td>
                      <Link
                        href={PLATFORM_PATHS.PLAN(row.plan_id)}
                        className="text-m2-ink hover:text-m2-brand-ink hover:underline"
                      >
                        {row.vessel ?? NO_VESSEL_LABEL}
                      </Link>
                    </td>
                    <td className="m2-num">{formatKstMonthDayTime(row.departure)}</td>
                    <td className="r m2-num text-m2-ok-ink">{won(row.total_saving_krw)}</td>
                    <td className="r m2-num">{won(row.platform_fee_krw)}</td>
                    <td className="r m2-num">{won(row.total_saving_krw - row.platform_fee_krw)}</td>
                  </tr>
                  {row.shippers.map(share => (
                    <tr key={`${row.plan_id}-${share.shipper_id}`}>
                      <td className="pl-6">{share.shipper_org_name ?? share.shipper_id}</td>
                      <td />
                      <td className="r m2-num">{won(share.saving_krw)}</td>
                      <td className="r m2-num">{won(share.fee_krw)}</td>
                      <td className="r m2-num">{won(share.saving_krw - share.fee_krw)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SettlementShell>
  );
}
