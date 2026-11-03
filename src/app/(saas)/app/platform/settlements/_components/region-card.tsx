'use client';

import type { ReactNode } from 'react';

import { usePlatformMetrics } from '@/apis/saas/platform-metrics';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { countText } from '@/app/(saas)/app/platform/_components/kpi/metric-format';
import { won } from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { Skeleton } from '@/components/ui/skeleton';

function RegionShell({ basis, children }: { basis?: string; children: ReactNode }) {
  return (
    <section className="m2-card" aria-labelledby="region-card-title">
      <div className="m2-card-h">
        <h2 id="region-card-title" className="m2-h2">
          지역별 절감
        </h2>
        {basis ? <span className="m2-chip">{basis}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function RegionCard() {
  const { data, isPending, isError, error, refetch, isFetching } = usePlatformMetrics();

  if (isError) {
    return (
      <RegionShell>
        <QueryError
          error={error}
          subject="지역별 집계를"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </RegionShell>
    );
  }
  if (isPending) {
    return (
      <RegionShell>
        <Skeleton className="h-36 rounded-[14px]" />
      </RegionShell>
    );
  }

  const basis = `${data.month} · 계획 ${countText(data.plan_count)}건`;

  if (data.regions.length === 0) {
    return (
      <RegionShell basis={basis}>
        <EmptyState
          compact
          title="이번 달 지역별 집계가 없습니다"
          description="계획에 실린 출하가 생기면 부울경·경북별 절감과 리퍼 컨테이너 수를 보여 줍니다."
        />
      </RegionShell>
    );
  }

  return (
    <RegionShell basis={basis}>
      <div className="-mx-2.5 overflow-x-auto px-2.5">
        <table className="m2-table">
          <thead>
            <tr>
              <th>지역</th>
              <th className="r">화주</th>
              <th className="r">파렛트(해상)</th>
              <th className="r">절감</th>
              <th className="r">부산항 리퍼</th>
            </tr>
          </thead>
          <tbody>
            {data.regions.map(region => (
              <tr key={region.region}>
                <td className="font-semibold text-m2-ink">{region.region}</td>
                <td className="r m2-num">{countText(region.shipper_count)}곳</td>
                <td className="r m2-num">
                  {countText(region.pallets)}({countText(region.sea_pallets)})
                </td>
                <td className="r m2-num text-m2-ok-ink">{won(region.savings_krw)}</td>
                <td className="r m2-num">{countText(region.reefer_containers)}대</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m2-sub" title={data.month_basis}>
        {`합계 리퍼 컨테이너 ${countText(data.reefer_containers)}대 · 해상 ${countText(data.sea_pallets)}파렛트 · 항공 ${countText(data.air_pallets)}파렛트`}
      </p>
    </RegionShell>
  );
}
