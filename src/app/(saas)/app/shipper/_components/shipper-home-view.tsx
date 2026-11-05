'use client';

import { useQueries } from '@tanstack/react-query';
import { ArrowRightIcon, CalendarDaysIcon, PackageIcon } from 'lucide-react';
import Link from 'next/link';

import { useMe } from '@/apis/saas/auth';
import {
  shipperPlanQueryOptions,
  useShipperCatalog,
  useShipperLots,
  useShipperOrgId,
} from '@/apis/saas/shipper';
import { useShipperChangeRequests } from '@/apis/saas/shipper-change-requests';
import { isReplanPending, useShipperPlanConfirmations } from '@/apis/saas/shipper-confirm';
import { useShipperProfile } from '@/apis/saas/shipper-profile';
import { PLAN_STATUS_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import { lotLabelMap } from '@/app/(saas)/app/shipper/_components/lot-label';
import { MyLotsCard } from '@/app/(saas)/app/shipper/_components/my-lots-card';
import { myPendingConfirmations, ownScopeOf } from '@/app/(saas)/app/shipper/_components/my-plan';
import { plainWords } from '@/app/(saas)/app/shipper/_components/plain-words';
import { CardSkeleton, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import {
  fmtCount,
  fmtLongDate,
  fmtMonthDayTime,
  timeOf,
} from '@/app/(saas)/app/shipper/_components/shipper-format';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { useNowMinute } from '@/app/(saas)/app/shipper/_components/use-now';
import { useShipperTasks } from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import { MapLinkProvider } from '@/components/map-link';
import type { ShipperLotT, ShipperPlanItemT } from '@/types/saas-shipper';

const CHANGE_TYPE = { reduce: '수량 감축', cancel: '출하 취소', air_switch: '항공 전환' };
const CHANGE_STATUS = { open: '검토 중', applied: '반영됨', rejected: '반려됨' };

function ActionRow({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-m2-bg flex min-w-0 items-center gap-4 rounded-xl border border-m2-line p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m2-navy"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-m2-ink">{title}</div>
        <div className="m2-sub mt-1 text-[13px]">{description}</div>
      </div>
      <ArrowRightIcon size={16} className="shrink-0 text-m2-muted" aria-hidden />
    </Link>
  );
}

function ShipmentSummary({ lots, capped }: { lots: ShipperLotT[]; capped: boolean }) {
  const groups = [
    {
      status: 'registered' as const,
      label: '계획 배정 대기',
      description: '등록한 출하를 검토하고 있습니다',
    },
    {
      status: 'planned' as const,
      label: '계획에 포함된 출하',
      description: '계획에 포함된 출하를 확인하세요',
    },
  ];
  const visible = groups
    .map(group => ({ ...group, lots: lots.filter(({ status }) => status === group.status) }))
    .filter(group => group.lots.length > 0);

  if (visible.length === 0) return null;

  return (
    <section aria-label="출하 현황" className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
      {visible.map(group => (
        <Link
          key={group.status}
          href={SHIPPER_PATHS.LOT_LIST(group.status)}
          className="m2-card group flex items-start gap-4"
        >
          <PackageIcon size={20} className="mt-1 shrink-0 text-m2-muted" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="m2-lbl">{group.label}</h2>
            <div className="m2-num mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[28px] leading-tight font-bold text-m2-navy">
                {fmtCount(group.lots.length)}
                <span className="ml-1 text-sm font-medium">건</span>
              </span>
              <span className="text-sm text-m2-muted">
                {fmtCount(group.lots.reduce((total, lot) => total + lot.pallets, 0))}파렛트
              </span>
            </div>
            <p className="m2-sub mt-2 text-[13px]">{group.description}</p>
            {capped && <p className="m2-sub text-xs">최근 조회된 출하 기준</p>}
          </div>
          <ArrowRightIcon size={16} className="mt-1 shrink-0 text-m2-muted" aria-hidden />
        </Link>
      ))}
    </section>
  );
}

function UpcomingSailings({
  plans,
  now,
  shipperIds,
}: {
  plans: ShipperPlanItemT[];
  now: number | null;
  shipperIds: string[];
}) {
  const orgId = useShipperOrgId();
  const candidates = plans.filter(plan => !isReplanPending(plan));
  const queries = useQueries({
    queries: candidates.map(({ plan_id }) => shipperPlanQueryOptions(orgId, plan_id)),
  });
  const rows = queries
    .flatMap((query, index) => {
      if (!query.data || now === null) return [];
      const { scenario, plan } = query.data;
      const own = new Set(shipperIds);
      return scenario.voyages.flatMap(voyage => {
        const pallets = plan.assignments
          .filter(
            item => item.mode === 'sea' && item.voyage_id === voyage.id && own.has(item.shipper_id)
          )
          .reduce((total, item) => total + item.pallets, 0);
        return pallets > 0 && timeOf(voyage.etd) > now
          ? [{ plan: candidates[index], voyage, pallets }]
          : [];
      });
    })
    .sort((a, b) => timeOf(a.voyage.etd) - timeOf(b.voyage.etd));
  const failed = queries.some(query => query.isError);

  if (failed)
    return (
      <QueryError
        message="예정된 출항 일정을 불러오지 못했습니다."
        onRetry={() => {
          void Promise.all(queries.map(query => query.refetch()));
        }}
        isRetrying={queries.some(query => query.isFetching)}
      />
    );
  if (queries.some(query => query.isPending)) return <CardSkeleton height={160} />;
  if (rows.length === 0) return null;

  return (
    <section className="m2-card" aria-labelledby="home-sailings">
      <div className="m2-card-h">
        <h2 id="home-sailings" className="m2-h2">
          다음 출항 예정
        </h2>
        <Link href={SHIPPER_PATHS.PLANS} className="m2-btn m2-btn-sec m2-btn-sm">
          운송계획 전체
        </Link>
      </div>
      <div className="divide-y divide-m2-line">
        {rows.slice(0, 3).map(({ plan, voyage, pallets }) => (
          <Link
            key={`${plan.plan_id}-${voyage.id}`}
            href={SHIPPER_PATHS.PLAN(plan.plan_id)}
            className="flex items-center gap-4 py-4 first:pt-1 last:pb-1"
          >
            <CalendarDaysIcon size={20} className="shrink-0 text-m2-muted" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{voyage.vessel_name}</div>
              <div className="m2-sub text-[13px]">
                {fmtMonthDayTime(voyage.etd)} 출항 예정 ·{' '}
                {PLAN_STATUS_LABEL[plan.status] ?? '계획 확인'}
              </div>
            </div>
            <span className="m2-num shrink-0 text-sm">내 출하 {fmtCount(pallets)}파렛트</span>
            <ArrowRightIcon
              size={16}
              className="shrink-0 text-m2-muted max-[480px]:hidden"
              aria-hidden
            />
          </Link>
        ))}
      </div>
      <p className="m2-sub mt-4 text-xs">운송계획 기준 일정이며 변경될 수 있습니다.</p>
    </section>
  );
}

export function ShipperHomeView() {
  const me = useMe();
  const catalog = useShipperCatalog();
  const lots = useShipperLots();
  const profile = useShipperProfile();
  const tasks = useShipperTasks();
  const planConfirmations = useShipperPlanConfirmations('pending');
  const changes = useShipperChangeRequests({ limit: 3 });
  const now = useNowMinute();
  const own = ownScopeOf(catalog.data);
  const labels = lotLabelMap(lots.data, catalog.data ?? null);
  const planIds = [...new Set((planConfirmations.data ?? []).map(({ plan_id }) => plan_id))];
  const executionTasks = tasks.byPlan
    .flatMap(({ plan, orders }) =>
      myPendingConfirmations(orders, own).map(item => ({ plan, ...item }))
    )
    .sort((a, b) => timeOf(a.confirmation.deadline) - timeOf(b.confirmation.deadline));
  const actionCount = planIds.length + executionTasks.length + tasks.requests.length;
  const tasksLoading =
    tasks.plans.isPending ||
    tasks.isOrdersLoading ||
    planConfirmations.isPending ||
    catalog.isPending;
  const tasksError =
    tasks.plans.isError || tasks.isOrdersError || planConfirmations.isError || catalog.isError;
  const needsOnboarding = !!profile.data && !profile.data.sandbox && !profile.data.ready;
  const registered = (lots.data ?? []).filter(({ status }) => status === 'registered');
  const recentChanges = [...(changes.data ?? [])]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 3);
  const awaitingLotIds = new Set([
    ...executionTasks.flatMap(({ confirmation }) => confirmation.lot_ids),
    ...(tasks.plans.data ?? [])
      .filter(plan => planIds.includes(plan.plan_id))
      .flatMap(plan => plan.my_lot_ids),
  ]);
  const replanCount = (tasks.plans.data ?? []).filter(isReplanPending).length;

  return (
    <MapLinkProvider>
      <ShipperPageHeader
        eyebrow={now === null ? '출하 현황' : fmtLongDate(now)}
        title={me.data?.active_org.org_name || '출하 현황'}
        sub="출하 현황과 지금 필요한 확인을 한눈에 살펴보세요."
      >
        <Link href={SHIPPER_PATHS.NEW_LOT} className="m2-btn m2-btn-pri">
          새 출하 등록 <ArrowRightIcon size={14} aria-hidden />
        </Link>
        <Link href={SHIPPER_PATHS.ONBOARDING} className="m2-btn m2-btn-sec">
          출하 장소 관리 <ArrowRightIcon size={14} aria-hidden />
        </Link>
      </ShipperPageHeader>

      <div className="flex flex-col gap-4">
        {profile.isError && (
          <QueryError
            message="출하 장소 정보를 불러오지 못했습니다."
            onRetry={() => {
              void profile.refetch();
            }}
            isRetrying={profile.isFetching}
          />
        )}
        {needsOnboarding && (
          <section className="m2-card">
            <h2 className="m2-h2">먼저 출하 장소를 등록하세요</h2>
            <p className="m2-sub mb-3">출하에 사용할 집하 장소와 취급 품목을 등록하세요.</p>
            <Link href={SHIPPER_PATHS.ADD_PACKHOUSE} className="m2-btn m2-btn-sec">
              출하 장소 등록 <ArrowRightIcon size={14} aria-hidden />
            </Link>
          </section>
        )}

        {tasksError && (
          <QueryError
            message="확인할 업무를 모두 불러오지 못했습니다."
            onRetry={() => {
              void Promise.all([
                tasks.plans.refetch(),
                tasks.refetchOrders(),
                planConfirmations.refetch(),
                catalog.refetch(),
              ]);
            }}
            isRetrying={
              tasks.plans.isFetching ||
              tasks.isOrdersFetching ||
              planConfirmations.isFetching ||
              catalog.isFetching
            }
          />
        )}
        {tasksLoading && !tasksError && <CardSkeleton height={140} />}
        {actionCount > 0 && (
          <section className="m2-card" aria-labelledby="home-actions">
            <div className="m2-card-h">
              <h2 id="home-actions" className="m2-h2">
                지금 확인할 일 <span className="ml-1 text-m2-muted">{actionCount}건</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 max-[767.98px]:grid-cols-1">
              {planIds.map(planId => {
                const plan = tasks.plans.data?.find(item => item.plan_id === planId);
                return (
                  <ActionRow
                    key={planId}
                    href={SHIPPER_PATHS.PLAN(planId)}
                    title="운송계획 수락 여부 확인"
                    description={
                      plan?.vessel
                        ? `${plan.vessel} · 내 출하 ${fmtCount(plan.my_pallets)}파렛트`
                        : '제안된 운송계획을 확인하고 수락 여부를 알려 주세요.'
                    }
                  />
                );
              })}
              {executionTasks.map(({ plan, order, confirmation }) => (
                <ActionRow
                  key={`${order.order_id}-${confirmation.shipper_id}`}
                  href={SHIPPER_PATHS.PLAN(plan.plan_id)}
                  title="실행 변경 확정"
                  description={`${fmtMonthDayTime(confirmation.deadline)}까지 · ${plainWords(confirmation.reason_text.join(' · '), labels) || '변경 내용을 확인해 주세요.'}`}
                />
              ))}
              {tasks.requests.length > 0 && (
                <ActionRow
                  href={SHIPPER_PATHS.REQUESTS}
                  title={`변경 요청에 응답 ${tasks.requests.length}건`}
                  description="운송 실행에 필요한 요청 내용을 확인해 주세요."
                />
              )}
            </div>
          </section>
        )}

        {!tasksLoading &&
          !tasksError &&
          lots.isSuccess &&
          actionCount === 0 &&
          !needsOnboarding && (
            <div className="rounded-xl border border-m2-line bg-white/60 px-5 py-4">
              <p className="text-sm font-semibold">
                {registered.length > 0 ? '운송계획 배정 대기 중' : '지금 확인할 업무가 없습니다'}
              </p>
              <p className="m2-sub mt-1 text-[13px]">
                {registered.length > 0
                  ? '포워더가 등록된 출하와 가용 공간을 검토해 운송계획을 제안할 수 있습니다.'
                  : '새로운 계획이나 변경 요청이 도착하면 이곳에 표시됩니다.'}
              </p>
            </div>
          )}
        {replanCount > 0 && (
          <p className="rounded-xl border border-m2-line px-5 py-4 text-sm text-m2-muted">
            운송계획 {replanCount}건을 다시 검토하고 있습니다. 새 계획이 준비되면 확인할 수
            있습니다.
          </p>
        )}

        {lots.isPending && <CardSkeleton height={140} />}
        {lots.data && <ShipmentSummary lots={lots.data} capped={lots.isCapped} />}
        {tasks.plans.data && (
          <UpcomingSailings plans={tasks.plans.data} now={now} shipperIds={own.shipperIds} />
        )}

        <MyLotsCard
          lots={lots.data}
          isError={lots.isError}
          isRetrying={lots.isFetching}
          onRetry={() => {
            void lots.refetch();
          }}
          catalog={catalog.data ?? null}
          myPlan={null}
          awaitingLotIds={awaitingLotIds}
        />

        {changes.isError && (
          <QueryError
            message="변경 요청 현황을 불러오지 못했습니다."
            onRetry={() => {
              void changes.refetch();
            }}
            isRetrying={changes.isFetching}
          />
        )}
        {changes.isPending && <CardSkeleton height={120} />}
        {recentChanges.length > 0 && (
          <section className="m2-card" aria-labelledby="home-changes">
            <div className="m2-card-h">
              <h2 id="home-changes" className="m2-h2">
                최근 변경 요청
              </h2>
              <Link href={SHIPPER_PATHS.PLANS} className="m2-btn m2-btn-sec m2-btn-sm">
                운송계획 전체
              </Link>
            </div>
            <div className="divide-y divide-m2-line">
              {recentChanges.map(request => (
                <Link
                  key={request.request_id}
                  href={SHIPPER_PATHS.PLAN(request.plan_id)}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {CHANGE_TYPE[request.type]} · {labels.get(request.lot_id) ?? '내 출하'}
                    </div>
                    <div className="m2-sub text-xs">
                      {fmtMonthDayTime(request.updated_at)} 업데이트
                    </div>
                  </div>
                  <span className="m2-chip shrink-0">{CHANGE_STATUS[request.status]}</span>
                  <ArrowRightIcon size={14} className="shrink-0 text-m2-muted" aria-hidden />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </MapLinkProvider>
  );
}
