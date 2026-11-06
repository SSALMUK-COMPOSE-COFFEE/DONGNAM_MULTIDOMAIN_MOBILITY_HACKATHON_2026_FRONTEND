'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { scenarioQueryOptions } from '@/apis/getScenario';
import { fuelShockQueryOptions } from '@/apis/postFuelShock';
import { ShockAllocationCard } from '@/app/(demo)/fuel-shock/_components/shock-allocation-card';
import { ShockShipperTable } from '@/app/(demo)/fuel-shock/_components/shock-shipper-table';
import { ShockSummary } from '@/app/(demo)/fuel-shock/_components/shock-summary';
import { SurchargeCard } from '@/app/(demo)/fuel-shock/_components/surcharge-card';
import { PlanLoadError } from '@/components/plan-load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { DEMO_FUEL_SHOCK } from '@/consts/demo';

/** 할증료 두 경우(470·2,060원)를 한 번에 풀어 두고 버튼으로 오가며 배정·절감 변화를 비교한다 */
export function FuelShockView() {
  const analysis = useQuery(fuelShockQueryOptions(DEMO_FUEL_SHOCK));
  const scenario = useQuery(scenarioQueryOptions(DEMO_FUEL_SHOCK.scenario_id));
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (analysis.isError || scenario.isError) {
    return (
      <PlanLoadError
        message="운임 쇼크 분석을 불러오지 못했습니다. 서버 연결을 확인하세요."
        onRetry={() => {
          if (analysis.isError) analysis.refetch();
          if (scenario.isError) scenario.refetch();
        }}
        isRetrying={analysis.isFetching || scenario.isFetching}
      />
    );
  }
  if (!analysis.isSuccess || !scenario.isSuccess) return <Skeleton className="h-96" />;

  const { cases } = analysis.data;
  const baseline = cases.find(({ is_baseline }) => is_baseline) ?? cases[0];
  const selected = cases[selectedIndex] ?? baseline;
  if (!selected || !baseline) {
    return <p className="text-muted-foreground">비교할 할증료 경우가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <ShockSummary shockCase={selected} />

      <div className="grid grid-cols-[480px_1fr] gap-6">
        <SurchargeCard
          result={analysis.data}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          baseline={baseline}
        />
        <ShockAllocationCard shockCase={selected} scenario={scenario.data} />
      </div>

      <ShockShipperTable shockCase={selected} scenario={scenario.data} />
    </div>
  );
}
