'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { usePlatformPlan } from '@/apis/saas/platform';
import { ContainerPlanCard } from '@/app/(saas)/app/platform/_components/container-plan-card';
import { PLATFORM_PATHS, readPlanQuery } from '@/app/(saas)/app/platform/_components/paths';
import { PlanHero } from '@/app/(saas)/app/platform/_components/plan-hero';
import { PlanStatusBadge } from '@/app/(saas)/app/platform/_components/plan-status-badge';
import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import {
  SceneVoyageTabs,
  buildPickedScene,
} from '@/app/(saas)/app/platform/_components/scene-voyage-tabs';
import { SettlementPreviewCard } from '@/app/(saas)/app/platform/_components/settlement-preview-card';
import { ShipperSavingsCard } from '@/app/(saas)/app/platform/plans/detail/_components/shipper-savings-card';
import { MapLinkProvider } from '@/components/map-link';
import { Skeleton } from '@/components/ui/skeleton';
import type { SaasPlanSessionT } from '@/types/api-saas';
import { formatKstMonthDayTime } from '@/utils/kst';
import { getShipperName } from '@/utils/scenario';

export function AdminPlanReview() {
  const planId = readPlanQuery(useSearchParams()) ?? '';
  const query = usePlatformPlan(planId);

  return (
    <>
      <PlatformHeader
        eyebrow="서비스 관리 · 운송계획"
        title="운송계획 상세 조회"
        sub={
          query.data
            ? `v${query.data.version} · ${formatKstMonthDayTime(query.data.created_at)}`
            : '등록된 계획의 배정 결과와 정산 근거를 확인합니다.'
        }
      >
        <Link href={PLATFORM_PATHS.PLANS} className="m2-btn m2-btn-sec">
          계획 목록
        </Link>
      </PlatformHeader>
      {!planId ? <p className="m2-note">조회할 계획을 목록에서 선택하세요.</p> : null}
      {planId && query.isPending ? <Skeleton className="h-96 rounded-xl" /> : null}
      {query.isError ? (
        <QueryError
          subject="운송계획을"
          error={query.error}
          onRetry={() => query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : null}
      {query.data ? (
        <MapLinkProvider>
          <ReviewBody session={query.data} />
        </MapLinkProvider>
      ) : null}
    </>
  );
}

function ReviewBody({ session }: { session: SaasPlanSessionT }) {
  const [picked, setPicked] = useState<string | null>(null);
  const scene = useMemo(() => buildPickedScene(session, {}, picked), [session, picked]);

  return (
    <>
      <div className="mb-4">
        <PlanStatusBadge status={session.status} />
      </div>
      <SceneVoyageTabs scene={scene} onPick={setPicked} />
      <PlanHero
        source={session}
        sceneSource={session}
        scene={scene}
        state="ready"
        label="계획 기준 비용 절감"
        hint="운송계획 배정 결과"
        idleText=""
      />
      <div className="m2-grid mt-5 grid-cols-1 min-[1400px]:grid-cols-2">
        <div className="m2-col">
          <ContainerPlanCard source={session} emptyText="등록된 적재안이 없습니다." />
          <section className="m2-card">
            <div className="m2-card-h">
              <h2 className="m2-h2">화물 배정 결과</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="m2-table">
                <thead>
                  <tr>
                    <th>화주</th>
                    <th>출하</th>
                    <th>운송</th>
                    <th className="r">파렛트</th>
                  </tr>
                </thead>
                <tbody>
                  {session.plan.assignments.map(assignment => (
                    <tr key={assignment.lot_id}>
                      <td>{getShipperName(session.scenario, assignment.shipper_id)}</td>
                      <td className="m2-mono">{assignment.lot_id}</td>
                      <td>{assignment.mode === 'air' ? '항공' : '해상'}</td>
                      <td className="r m2-num">{assignment.pallets}</td>
                    </tr>
                  ))}
                  {session.plan.unassigned.map(lot => (
                    <tr key={lot.lot_id}>
                      <td>{getShipperName(session.scenario, lot.shipper_id)}</td>
                      <td className="m2-mono">{lot.lot_id}</td>
                      <td>미배정</td>
                      <td className="r m2-num">{lot.pallets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div className="m2-col">
          <SettlementPreviewCard
            source={session}
            title="계획 정산"
            emptyText="정산 결과가 없습니다."
          />
          <ShipperSavingsCard session={session} />
        </div>
      </div>
    </>
  );
}
