'use client';

import { isAxiosError } from 'axios';
import { cn } from 'cn';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { usePlatformPlan, usePlatformPlans } from '@/apis/saas/platform';
import { ContainerPlanCard } from '@/app/(saas)/app/platform/_components/container-plan-card';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import {
  kstDayTime,
  monthDay,
  productOf,
  productShortName,
} from '@/app/(saas)/app/platform/_components/m2-format';
import { PLATFORM_PATHS, readPlanQuery } from '@/app/(saas)/app/platform/_components/paths';
import { PlanHero } from '@/app/(saas)/app/platform/_components/plan-hero';
import {
  type VerdictT,
  packhouseOfShipper,
  runKeysOfLot,
  verdictLinkKeys,
  verdictOf,
  voyageView,
} from '@/app/(saas)/app/platform/_components/plan-model';
import { PlanStatusBadge } from '@/app/(saas)/app/platform/_components/plan-status-badge';
import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { SettlementPreviewCard } from '@/app/(saas)/app/platform/_components/settlement-preview-card';
import { ForwarderAssignCard } from '@/app/(saas)/app/platform/plans/detail/_components/forwarder-assign-card';
import { ReplanSection } from '@/app/(saas)/app/platform/plans/detail/_components/replan-section';
import { ShipperSavingsCard } from '@/app/(saas)/app/platform/plans/detail/_components/shipper-savings-card';
import { TariffSheetCard } from '@/app/(saas)/app/platform/plans/detail/_components/tariff-sheet-card';
import { type StepItemT, Steps, buildPlanScene } from '@/components/map-hero';
import { MapLinkProvider, useMapLinkTarget } from '@/components/map-link';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlanSessionT } from '@/types/api';
import { formatKstMonthDayTime } from '@/utils/kst';
import { getShipperName } from '@/utils/scenario';

const EYEBROW = '공동적재 계획 · 계획 상세';

export function PlanDetailView() {
  const planId = readPlanQuery(useSearchParams()) ?? '';
  const { data: session, isPending, isError, error, refetch, isFetching } = usePlatformPlan(planId);

  if (!planId || (isError && isAxiosError(error) && error.response?.status === 404)) {
    return (
      <>
        <PlatformHeader eyebrow={EYEBROW} title="계획을 찾을 수 없습니다" />
        <EmptyState
          title="계획을 찾을 수 없습니다"
          description="지워졌거나 다른 조직의 계획입니다."
        >
          <Link href={PLATFORM_PATHS.PLANS} className="m2-btn m2-btn-sec">
            계획 목록으로
          </Link>
        </EmptyState>
      </>
    );
  }
  if (isError) {
    return (
      <>
        <PlatformHeader eyebrow={EYEBROW} title="공동적재 계획 상세" />
        <QueryError
          error={error}
          subject="운송계획을"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </>
    );
  }
  if (isPending) {
    return (
      <>
        <PlatformHeader eyebrow={EYEBROW} title="공동적재 계획 상세" />
        <Skeleton className="mb-4 h-16 rounded-[16px]" />
        <Skeleton className="h-[500px] rounded-[18px]" />
      </>
    );
  }

  return (
    <MapLinkProvider>
      <PlanDetailScreen planId={planId} session={session} />
    </MapLinkProvider>
  );
}

function PlanDetailScreen({ planId, session }: { planId: string; session: PlanSessionT }) {
  const plansQuery = usePlatformPlans();
  const planItem = plansQuery.data?.find(item => item.plan_id === planId) ?? null;
  const scene = useMemo(() => buildPlanScene(session), [session]);
  const voyage = voyageView(session);
  const { plan } = session;
  const totalPallets = [...plan.assignments, ...plan.unassigned].reduce(
    (sum, { pallets }) => sum + pallets,
    0
  );
  const lotCount = plan.assignments.length + plan.unassigned.length;
  const airCount = plan.assignments.filter(({ mode }) => mode === 'air').length;

  const steps: StepItemT[] = [
    { title: '화물 선택', sub: `${lotCount}건 · ${totalPallets}파렛트`, state: 'done' },
    {
      title: '조건 검토',
      sub: [
        `컨테이너 ${plan.containers.filter(({ used }) => used).length}대`,
        airCount > 0 ? `항공 ${airCount}건` : '',
        plan.unassigned.length > 0 ? `제외 ${plan.unassigned.length}건` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      state: 'done',
    },
    {
      title: '계획 생성',
      sub: `v${session.version} · ${formatKstMonthDayTime(session.created_at)}`,
      state: 'done',
    },
    {
      title: '포워더 배정',
      sub:
        planItem?.forwarder?.org_name ?? (plansQuery.isPending ? '확인 중' : '포워더를 고르세요'),
      state: planItem?.forwarder ? 'done' : 'cur',
    },
  ];

  return (
    <>
      <PlatformHeader
        eyebrow={EYEBROW}
        title={voyage ? `${voyage.vesselName} 항차 공동적재 계획` : '공동적재 계획 상세'}
        sub={[
          voyage
            ? `${voyage.id} · ${voyage.terminal ?? voyage.originName} → ${voyage.destinationName} · ETD ${kstDayTime(voyage.etd)} · CY 마감 ${kstDayTime(voyage.cyCutoff)}`
            : '',
          `버전 ${session.version} · 갱신 ${formatKstMonthDayTime(session.updated_at)}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        <PlanStatusBadge status={session.status} />
        <Link href={PLATFORM_PATHS.COLDCHAIN_OF(planId)} className="m2-btn m2-btn-sec">
          콜드체인 관제
        </Link>
        <Link href={PLATFORM_PATHS.PLANS} className="m2-btn m2-btn-sec">
          목록
        </Link>
      </PlatformHeader>

      <Steps items={steps} />

      <PlanHero
        source={session}
        sceneSource={session}
        scene={scene}
        state="ready"
        label="단독 발송 대비 절감 · 이 계획 기준"
        hint="지점을 누르면 아래 배정 행으로 이동합니다"
        idleText=""
      />

      <SectionErrorBoundary message="계획 상세를 그리지 못했습니다." className="h-96">
        <div className="m2-grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] max-[1180px]:grid-cols-1">
          <div className="m2-col">
            <PlanLotsCard session={session} runs={scene.runs} />
            <ShipperSavingsCard session={session} />
          </div>
          <div className="m2-col">
            <ForwarderAssignCard planId={planId} />
            <ContainerPlanCard source={session} emptyText="" />
            <SettlementPreviewCard title="정산" source={session} emptyText="" />
            {plan.settlement_tariffs?.map(tariff => (
              <TariffSheetCard
                key={tariff.product_id}
                tariff={tariff}
                scenario={session.scenario}
              />
            ))}
          </div>
        </div>
      </SectionErrorBoundary>

      <div className="mt-4">
        <SectionErrorBoundary message="재최적화 영역을 그리지 못했습니다." className="h-64">
          <ReplanSection key={session.plan_id} session={session} />
        </SectionErrorBoundary>
      </div>
    </>
  );
}

type PlanLotRowT = {
  lotId: string;
  shipperId: string;
  productId: string;
  pallets: number;
  readyDate: string | null;
  sellByDate: string | null;
};

function PlanLotsCard({
  session,
  runs,
}: {
  session: PlanSessionT;
  runs: { key: string; lotIds: string[] }[];
}) {
  const { plan, scenario } = session;
  const lotById = new Map(scenario.lots.map(lot => [lot.id, lot]));
  const rows: PlanLotRowT[] = [
    ...plan.assignments.map(({ lot_id, shipper_id, product_id, pallets }) => ({
      lotId: lot_id,
      shipperId: shipper_id,
      productId: product_id,
      pallets,
    })),
    ...plan.unassigned.map(({ lot_id, shipper_id, pallets }) => ({
      lotId: lot_id,
      shipperId: shipper_id,
      productId: lotById.get(lot_id)?.product_id ?? '',
      pallets,
    })),
  ].map(row => ({
    ...row,
    readyDate: lotById.get(row.lotId)?.ready_date ?? null,
    sellByDate: lotById.get(row.lotId)?.sell_by_date ?? null,
  }));
  const shipperCount = new Set(rows.map(({ shipperId }) => shipperId)).size;

  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">배정 결과</h2>
          <div className="m2-sub m2-num">
            {rows.length}건 · 화주 {shipperCount}곳 ·{' '}
            {rows.reduce((sum, { pallets }) => sum + pallets, 0)}파렛트
          </div>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyState compact title="이 계획에 담긴 출하가 없습니다" />
      ) : (
        <div className="-mx-2.5 overflow-x-auto px-2.5 pb-1">
          <table className="m2-table">
            <thead>
              <tr>
                <th>화주 · 로트</th>
                <th>품목</th>
                <th className="r">파렛트</th>
                <th>준비 → 기한</th>
                <th>판정</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const verdict = verdictOf(session, row.lotId, row.readyDate);
                const packhouseId = packhouseOfShipper(scenario.shippers, row.shipperId);
                return (
                  <PlanLotRow
                    key={row.lotId}
                    row={row}
                    session={session}
                    verdict={verdict}
                    keys={[
                      ...(packhouseId ? [packhouseId] : []),
                      ...runKeysOfLot(runs, row.lotId),
                      row.lotId,
                      ...verdictLinkKeys(verdict, row.lotId),
                    ]}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PlanLotRow({
  row,
  session,
  verdict,
  keys,
}: {
  row: PlanLotRowT;
  session: PlanSessionT;
  verdict: VerdictT | null;
  keys: string[];
}) {
  const { className: linkClassName, ...link } = useMapLinkTarget(keys);
  const product = productOf(session.scenario, row.productId);
  const toneClass = verdict
    ? { ok: 'm2-chip-ok', warn: 'm2-chip-warn', muted: '' }[verdict.tone]
    : '';

  return (
    <tr {...link} className={cn(verdict?.mode === 'out' && 'is-dis', linkClassName)}>
      <td className="whitespace-normal">
        <div className="m2-who">
          {getShipperName(session.scenario, row.shipperId)}
          <small className="m2-mono break-all whitespace-normal">{row.lotId}</small>
        </div>
      </td>
      <td>
        {row.productId ? (
          <span className={cn('m2-chip', product?.so2_treated ? 'm2-chip-grape' : 'm2-chip-berry')}>
            <span className="m2-dot" />
            {productShortName(product, row.productId)}
          </span>
        ) : (
          '–'
        )}
      </td>
      <td className="r m2-num font-bold">{row.pallets}</td>
      <td className="m2-num">
        {monthDay(row.readyDate)} → {monthDay(row.sellByDate)}
      </td>
      <td className="min-w-[112px] whitespace-normal">
        {verdict ? (
          <span className={cn('m2-chip', toneClass)} title={verdict.reason ?? verdict.label}>
            {verdict.label}
          </span>
        ) : (
          '–'
        )}
        {verdict?.reason ? (
          <span className="mt-1 block text-[11.5px] leading-snug text-m2-muted">
            {verdict.reason}
          </span>
        ) : null}
      </td>
    </tr>
  );
}
