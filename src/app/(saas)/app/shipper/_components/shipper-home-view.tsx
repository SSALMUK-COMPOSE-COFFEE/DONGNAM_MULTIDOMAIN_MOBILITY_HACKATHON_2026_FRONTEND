'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { useMe } from '@/apis/saas/auth';
import {
  useShipperCatalog,
  useShipperLots,
  useShipperOrgId,
  useShipperPlan,
} from '@/apis/saas/shipper';
import { lotLabel } from '@/app/(saas)/app/shipper/_components/lot-label';
import { MOBILE_STEPS } from '@/app/(saas)/app/shipper/_components/mobile';
import { MyLotsCard } from '@/app/(saas)/app/shipper/_components/my-lots-card';
import {
  CONFIRM_WAIT_LABEL,
  type MyPlanT,
  type OwnScopeT,
  buildMyPlan,
  confirmWaitOf,
  myPendingConfirmations,
  ownScopeOf,
} from '@/app/(saas)/app/shipper/_components/my-plan';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
  errorStatus,
} from '@/app/(saas)/app/shipper/_components/query-state';
import {
  fmtCount,
  fmtDayTime,
  fmtLongDate,
  fmtMonthDay,
  fmtMonthDayTime,
  timeOf,
} from '@/app/(saas)/app/shipper/_components/shipper-format';
import { ShipperLotForm } from '@/app/(saas)/app/shipper/_components/shipper-lot-form';
import { ShipperMapHero } from '@/app/(saas)/app/shipper/_components/shipper-map-hero';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import {
  type PendingConfirmationT,
  ShipperPlanCard,
} from '@/app/(saas)/app/shipper/_components/shipper-plan-card';
import { useNowMinute } from '@/app/(saas)/app/shipper/_components/use-now';
import { useShipperTasks } from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import { type StepItemT, Steps } from '@/components/map-hero';
import { MapLinkProvider } from '@/components/map-link';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import type { ShipperCatalogT, ShipperLotT, ShipperOrderT } from '@/types/saas-shipper';

const NEW_LOT_ANCHOR = 'new-lot';

type StepsInputT = {
  lots: ShipperLotT[];
  catalog: ShipperCatalogT | null;
  myPlan: MyPlanT | null;
  hasPlan: boolean;
  pending: PendingConfirmationT[] | null;
  orders: ShipperOrderT[] | null;
  now: number | null;
};

const stepsOf = ({
  lots,
  catalog,
  myPlan,
  hasPlan,
  pending,
  orders,
  now,
}: StepsInputT): StepItemT[] => {
  const active = lots.filter(({ status }) => status !== 'cancelled');
  const latest = [...active].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const latestLabel = latest ? lotLabel(latest, catalog) : '품목·수량 등 다섯 가지';

  const register: StepItemT = {
    title: '출하 등록',
    sub: myPlan
      ? `${myPlan.products.map(({ name }) => name).join('·')} ${fmtCount(myPlan.seaPallets + myPlan.airPallets)}파렛트`
      : latestLabel,
    state: active.length > 0 || myPlan || hasPlan ? 'done' : 'cur',
  };

  if (!myPlan) {
    return [
      register,
      {
        title: '계획 확인',
        sub: active.length > 0 && !hasPlan ? '플랫폼이 출하를 묶는 중' : '',
        state: active.length > 0 || hasPlan ? 'cur' : 'todo',
      },
      { title: '확정', state: 'todo' },
      { title: '집하·출항', state: 'todo' },
    ];
  }

  const { container, voyage, firstStop, airPallets, session } = myPlan;
  const planSub = [
    container?.container_id ?? (airPallets > 0 ? '항공 전환' : ''),
    voyage ? `${fmtMonthDay(voyage.etd)} 출항` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const pickupSub = [
    firstStop ? `${fmtMonthDayTime(firstStop.stop.eta)} 상차` : '',
    !firstStop && voyage ? `${fmtMonthDayTime(voyage.etd)} 출항` : '',
  ].join('');
  const sailed = !!voyage && now !== null && timeOf(voyage.etd) <= now;

  if (pending === null || orders === null) {
    return [
      register,
      { title: '계획 확인', sub: planSub, state: 'cur' },
      { title: '확정', state: 'todo' },
      { title: '집하·출항', sub: pickupSub, state: 'todo' },
    ];
  }

  if (pending.length > 0) {
    const deadline = pending
      .map(({ confirmation }) => confirmation.deadline)
      .sort((a, b) => timeOf(a) - timeOf(b))[0];

    return [
      register,
      { title: '계획 확인', sub: planSub, state: 'cur' },
      { title: '확정', sub: deadline ? `${fmtMonthDayTime(deadline)}까지` : '', state: 'todo' },
      { title: '집하·출항', sub: pickupSub, state: 'todo' },
    ];
  }

  const wait = confirmWaitOf(session, orders, pending.length);
  const pickupState: StepItemT['state'] = wait ? 'todo' : 'cur';

  return [
    register,
    { title: '계획 확인', sub: planSub, state: 'done' },
    {
      title: '확정',
      sub: wait ? CONFIRM_WAIT_LABEL[wait] : '확정 완료',
      state: wait ? 'cur' : 'done',
    },
    {
      title: '집하·출항',
      sub: pickupSub,
      state: sailed ? 'done' : pickupState,
    },
  ];
};

export function ShipperHomeView() {
  const me = useMe();
  const orgId = useShipperOrgId();
  const catalog = useShipperCatalog();
  const lots = useShipperLots();
  const tasks = useShipperTasks();
  const now = useNowMinute();

  const own: OwnScopeT = useMemo(() => ownScopeOf(catalog.data), [catalog.data]);

  const plansReady = !!tasks.plans.data && (!tasks.isOrdersLoading || tasks.isOrdersError);
  const latestPlanId =
    [...(tasks.plans.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      ?.plan_id ?? '';
  const focusPlanId = plansReady ? (tasks.confirmations[0]?.plan.plan_id ?? latestPlanId) : '';
  const plan = useShipperPlan(focusPlanId);

  const myPlan = useMemo(
    () => (plan.data && catalog.data ? buildMyPlan(plan.data, own) : null),
    [plan.data, catalog.data, own]
  );
  const focusEntry = tasks.byPlan.find(({ plan: item }) => item.plan_id === focusPlanId);
  const focusOrders = focusEntry?.ordersLoaded ? focusEntry.orders : null;
  const pending = focusOrders ? myPendingConfirmations(focusOrders, own) : null;
  const allPending = tasks.confirmations.flatMap(({ order }) =>
    myPendingConfirmations([order], own)
  );
  const awaitingLotIds = new Set(tasks.confirmations.flatMap(({ plan: item }) => item.my_lot_ids));
  const earliestDeadline = allPending
    .map(({ confirmation }) => confirmation.deadline)
    .sort((a, b) => timeOf(a) - timeOf(b))[0];

  const orgName = me.data?.active_org.org_name ?? '';

  const heroArea = () => {
    if (tasks.plans.isError) {
      return (
        <QueryError
          className="mb-4"
          message="운송계획을 불러오지 못했습니다."
          onRetry={() => tasks.plans.refetch()}
          isRetrying={tasks.plans.isFetching}
        />
      );
    }
    if (!plansReady || catalog.isPending) return <CardSkeleton height={392} className="mb-4" />;
    if (!focusPlanId) {
      return (
        <EmptyState
          className="mb-4 min-h-[240px]"
          title="아직 들어간 운송계획이 없습니다"
          description="출하를 등록하면 플랫폼이 다른 화주 출하와 묶어 계획을 만듭니다. 계획이 나오면 여기 지도에 내 집하 경로와 배가 보입니다."
          action={{ href: `#${NEW_LOT_ANCHOR}`, label: '출하 등록하기' }}
        />
      );
    }
    if (plan.isError) {
      return errorStatus(plan.error) === 404 ? (
        <EmptyState
          className="mb-4"
          title="계획을 찾을 수 없습니다"
          description="지워졌거나 내 출하가 빠진 계획입니다."
        />
      ) : (
        <QueryError
          className="mb-4"
          message="운송계획을 불러오지 못했습니다."
          onRetry={() => plan.refetch()}
          isRetrying={plan.isFetching}
        />
      );
    }
    if (catalog.isError) {
      return (
        <QueryError
          className="mb-4"
          message="내 화주 정보를 불러오지 못해 계획 지도를 그리지 못했습니다."
          onRetry={() => catalog.refetch()}
          isRetrying={catalog.isFetching}
        />
      );
    }
    if (!myPlan) return <CardSkeleton height={392} className="mb-4" />;

    return (
      <SectionErrorBoundary message="지도를 그리지 못했습니다." className="mb-4 h-[392px]">
        <ShipperMapHero myPlan={myPlan} now={now} />
      </SectionErrorBoundary>
    );
  };

  return (
    <MapLinkProvider>
      <ShipperPageHeader
        eyebrow={now === null ? ' ' : fmtLongDate(now)}
        title={orgName ? `안녕하세요, ${orgName}님` : '안녕하세요'}
        sub={
          allPending.length > 0
            ? `확정을 기다리는 계획이 ${allPending.length}건 있어요.${
                earliestDeadline ? ` ${fmtDayTime(earliestDeadline)}까지 확정해 주세요.` : ''
              }`
            : null
        }
      >
        {tasks.requests.length > 0 && (
          <Link href={SHIPPER_PATHS.REQUESTS} className="m2-btn m2-btn-sec">
            응답할 요청 {tasks.requests.length}건
          </Link>
        )}
      </ShipperPageHeader>

      <Steps
        className={MOBILE_STEPS}
        items={stepsOf({
          lots: lots.data ?? [],
          catalog: catalog.data ?? null,
          myPlan,
          hasPlan: !!focusPlanId,
          pending,
          orders: focusOrders,
          now,
        })}
      />

      {heroArea()}

      <div className="m2-grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] max-[1180px]:grid-cols-1">
        <div className="m2-col">
          {tasks.isOrdersError && (
            <QueryError
              message="실행 지시를 불러오지 못했습니다."
              onRetry={() => tasks.refetchOrders()}
              isRetrying={tasks.isOrdersFetching}
            />
          )}
          {myPlan && plan.data && (
            <SectionErrorBoundary message="계획 카드를 그리지 못했습니다." className="h-64">
              <ShipperPlanCard myPlan={myPlan} own={own} pending={pending} orders={focusOrders} />
            </SectionErrorBoundary>
          )}
          <MyLotsCard
            lots={lots.data}
            isError={lots.isError}
            isRetrying={lots.isFetching}
            onRetry={() => lots.refetch()}
            catalog={catalog.data ?? null}
            myPlan={myPlan}
            awaitingLotIds={awaitingLotIds}
          />
        </div>

        <SectionErrorBoundary message="출하 등록 영역을 그리지 못했습니다." className="h-96">
          {catalog.isError && (
            <QueryError
              message="품목·선과장 정보를 불러오지 못했습니다."
              onRetry={() => catalog.refetch()}
              isRetrying={catalog.isFetching}
            />
          )}
          {catalog.isPending && <CardSkeleton height={620} />}
          {catalog.data && catalog.data.shippers.length === 0 && (
            <div className="m2-card">
              <EmptyState
                title="조직에 등록된 화주 · 선과장 정보가 없습니다"
                description="플랫폼에 화주 프로필과 선과장 등록을 요청하세요."
              />
            </div>
          )}
          {catalog.data && catalog.data.shippers.length > 0 && (
            <ShipperLotForm
              key={`${orgId}:${catalog.data.id}`}
              id={NEW_LOT_ANCHOR}
              catalog={catalog.data}
            />
          )}
        </SectionErrorBoundary>
      </div>
    </MapLinkProvider>
  );
}
