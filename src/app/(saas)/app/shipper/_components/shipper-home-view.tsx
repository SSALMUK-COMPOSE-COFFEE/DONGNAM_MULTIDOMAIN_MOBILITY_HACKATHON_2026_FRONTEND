'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { useMe } from '@/apis/saas/auth';
import {
  useShipperCatalog,
  useShipperLots,
  useShipperOrgId,
  useShipperPlan,
  useShipperPlans,
  useShipperSettlements,
} from '@/apis/saas/shipper';
import { isReplanPending, useShipperPlanConfirmations } from '@/apis/saas/shipper-confirm';
import { useShipperProfile } from '@/apis/saas/shipper-profile';
import { LossDisclosureCard } from '@/app/(saas)/app/shipper/_components/loss-disclosure-card';
import { lotLabel, lotLabelMap } from '@/app/(saas)/app/shipper/_components/lot-label';
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
  PlanConfirmCard,
  ReplanPendingNotice,
} from '@/app/(saas)/app/shipper/_components/plan-confirm-card';
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
  fmtWon,
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
import { UNASSIGNED_PLACEHOLDER } from '@/app/(saas)/app/shipper/_components/vessel-label';
import { type StepItemT, Steps } from '@/components/map-hero';
import { MapLinkProvider } from '@/components/map-link';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import type {
  ShipperCatalogT,
  ShipperLotT,
  ShipperOrderT,
  ShipperPlanItemT,
} from '@/types/saas-shipper';
import { NO_VESSEL_LABEL, planOptionLabel } from '@/utils/plan-label';

const NEW_LOT_ANCHOR = 'new-lot';
const NO_PRODUCTS: string[] = [];
const SEASON_TITLE_ID = 'season-savings-title';
const CONFIRM_CARD_LIMIT = 3;

const planItemLabel = (item: ShipperPlanItemT | undefined) =>
  item
    ? planOptionLabel({ ...item, plan_id: '' }).replace(NO_VESSEL_LABEL, UNASSIGNED_PLACEHOLDER)
    : '';

type StepsInputT = {
  lots: ShipperLotT[];
  catalog: ShipperCatalogT | null;
  myPlan: MyPlanT | null;
  hasPlan: boolean;
  pending: PendingConfirmationT[] | null;
  orders: ShipperOrderT[] | null;
  now: number | null;
  planConfirmPending: boolean;
  replanPending: boolean;
};

const stepsOf = ({
  lots,
  catalog,
  myPlan,
  hasPlan,
  pending,
  orders,
  now,
  planConfirmPending,
  replanPending,
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

  if (replanPending) {
    return [
      register,
      { title: '계획 확인', sub: '다시 짜는 중', state: 'cur' },
      { title: '확정', state: 'todo' },
      { title: '집하·출항', state: 'todo' },
    ];
  }

  if (planConfirmPending) {
    return [
      register,
      { title: '계획 확인', sub: [planSub, '수락 대기'].filter(Boolean).join(' · '), state: 'cur' },
      { title: '확정', state: 'todo' },
      { title: '집하·출항', sub: pickupSub, state: 'todo' },
    ];
  }

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

function SeasonStat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="m2-lbl">{label}</dt>
      <dd
        className="m2-num mt-1 text-[24px] leading-tight font-bold tracking-[-0.02em] max-[767.98px]:text-[20px]"
        style={tone ? { color: tone } : {}}
      >
        {fmtWon(value)}
      </dd>
    </div>
  );
}

const AWAITING_SHIPPER = 'pending_shipper_confirmation';

function SeasonSavingsCard({ myPlan }: { myPlan: MyPlanT | null }) {
  const settlements = useShipperSettlements();
  const plans = useShipperPlans();

  if (settlements.isError || plans.isError) {
    return (
      <QueryError
        className="mb-4"
        message="이번 시즌 정산을 불러오지 못했습니다."
        onRetry={() => {
          void settlements.refetch();
          void plans.refetch();
        }}
        isRetrying={settlements.isFetching || plans.isFetching}
      />
    );
  }
  if (settlements.isPending || plans.isPending) {
    return <CardSkeleton height={148} className="mb-4" />;
  }

  const awaiting = new Set(
    plans.data.filter(({ status }) => status === AWAITING_SHIPPER).map(({ plan_id }) => plan_id)
  );
  const rows = settlements.data.filter(({ plan_id }) => !awaiting.has(plan_id));
  const excluded = new Set(
    settlements.data.filter(({ plan_id }) => awaiting.has(plan_id)).map(({ plan_id }) => plan_id)
  ).size;
  const sum = (pick: (row: (typeof rows)[number]) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);
  const savings = sum(({ savings: value }) => value);
  const fee = sum(({ fee: value }) => value);
  const gain = sum(({ shipper_gain }) => shipper_gain);
  const myPallets = sum(({ sea_pallets, air_pallets }) => sea_pallets + air_pallets);
  const planCount = new Set(rows.map(({ plan_id }) => plan_id)).size;
  const pilot = rows.some(row => row.pilot);
  const container = myPlan?.container ?? null;

  return (
    <section className="m2-card mb-4" aria-labelledby={SEASON_TITLE_ID}>
      <div className="m2-card-h flex-wrap">
        <h2 id={SEASON_TITLE_ID} className="m2-h2">
          이번 시즌 내가 아낀 금액
        </h2>
        <Link href={SHIPPER_PATHS.SETTLEMENTS} className="m2-btn m2-btn-sec m2-btn-sm">
          정산 자세히
          <ArrowRightIcon size={14} aria-hidden />
        </Link>
      </div>
      <dl className="m2-grid grid-cols-3 max-[767.98px]:grid-cols-1 max-[767.98px]:gap-2">
        <SeasonStat label="아낀 금액" value={savings} tone="var(--m2-ok-ink)" />
        <SeasonStat label="수수료" value={fee} />
        <SeasonStat label="내 몫" value={gain} tone="var(--m2-navy)" />
      </dl>
      <div className="m2-sub mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
        {rows.length === 0 ? (
          <span>
            {excluded > 0
              ? '내가 확인한 계획이 생기면 여기에 쌓입니다.'
              : '계획에 출하가 들어가면 여기에 쌓입니다.'}
          </span>
        ) : (
          <span className="m2-num">
            내 파렛트 {fmtCount(myPallets)} · 계획 {fmtCount(planCount)}건 기준
          </span>
        )}
        {container && myPlan && (
          <span className="m2-num">
            {container.container_id} · 내 파렛트 {fmtCount(myPlan.myContainerPallets)} / 컨테이너
            전체 {fmtCount(container.pallets)}
          </span>
        )}
        {excluded > 0 && (
          <span className="m2-num">
            화주 확인 대기 {fmtCount(excluded)}건 제외 (확인 전 절감액은 합의 전 제안값)
          </span>
        )}
        {pilot && <span>무료 시범 항차가 있어 수수료를 받지 않은 계획이 있습니다.</span>}
      </div>
    </section>
  );
}

function OnboardingCallout() {
  return (
    <section className="m2-card mb-4" aria-labelledby="shipper-onboarding-title">
      <h2 id="shipper-onboarding-title" className="m2-h2">
        먼저 선과장을 등록하세요
      </h2>
      <div className="m2-sub mb-3">
        출하를 모으는 선과장의 이름·주소·위치·취급 품목을 알려주시면 바로 출하를 등록할 수 있어요.
      </div>
      <Link href={SHIPPER_PATHS.ONBOARDING} className="m2-btn m2-btn-pri">
        선과장 등록하기
        <ArrowRightIcon size={14} aria-hidden />
      </Link>
    </section>
  );
}

export function ShipperHomeView() {
  const me = useMe();
  const orgId = useShipperOrgId();
  const catalog = useShipperCatalog();
  const lots = useShipperLots();
  const profile = useShipperProfile();
  const tasks = useShipperTasks();
  const now = useNowMinute();

  const own: OwnScopeT = useMemo(() => ownScopeOf(catalog.data), [catalog.data]);

  const planConfirmations = useShipperPlanConfirmations('pending');
  const confirmPlanIds = [...new Set((planConfirmations.data ?? []).map(({ plan_id }) => plan_id))];
  const labels = useMemo(
    () => lotLabelMap(lots.data, catalog.data ?? null),
    [lots.data, catalog.data]
  );

  const plansReady = !!tasks.plans.data && (!tasks.isOrdersLoading || tasks.isOrdersError);
  const latestPlanId =
    [...(tasks.plans.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      ?.plan_id ?? '';
  const focusPlanId = plansReady
    ? (tasks.confirmations[0]?.plan.plan_id ?? confirmPlanIds[0] ?? latestPlanId)
    : '';
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
  const planItemOf = (planId: string) =>
    tasks.plans.data?.find(({ plan_id }) => plan_id === planId);
  const focusReplanPending =
    (isReplanPending(plan.data) || isReplanPending(planItemOf(focusPlanId))) &&
    !confirmPlanIds.includes(focusPlanId);
  const isReplanning =
    (tasks.plans.data ?? []).some(
      item => isReplanPending(item) && !confirmPlanIds.includes(item.plan_id)
    ) || focusReplanPending;
  const waitingCount = allPending.length + confirmPlanIds.length;
  const waitingWord = confirmPlanIds.length > 0 ? '확인' : '확정';

  const needsOnboarding = !!profile.data && !profile.data.sandbox && !profile.data.ready;
  const preferredProductIds = profile.data?.profile?.product_ids ?? NO_PRODUCTS;

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
          {...(needsOnboarding
            ? {}
            : { action: { href: `#${NEW_LOT_ANCHOR}`, label: '출하 등록하기' } })}
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
          waitingCount > 0
            ? `${waitingWord}을 기다리는 계획이 ${waitingCount}건 있어요.${
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

      {needsOnboarding && <OnboardingCallout />}

      {!needsOnboarding && <SeasonSavingsCard myPlan={myPlan} />}

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
          planConfirmPending: confirmPlanIds.includes(focusPlanId),
          replanPending: focusReplanPending,
        })}
      />

      {isReplanning && <ReplanPendingNotice className="mb-4" />}

      {heroArea()}

      <div className="m2-grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] max-[1180px]:grid-cols-1">
        <div className="m2-col">
          {planConfirmations.isError && (
            <QueryError
              message="계획 확인 요청을 불러오지 못했습니다."
              onRetry={() => planConfirmations.refetch()}
              isRetrying={planConfirmations.isFetching}
            />
          )}
          {confirmPlanIds.slice(0, CONFIRM_CARD_LIMIT).map(planId => (
            <SectionErrorBoundary
              key={planId}
              message="계획 확인을 그리지 못했습니다."
              className="h-40"
            >
              <PlanConfirmCard
                planId={planId}
                labels={labels}
                planLabel={planItemLabel(planItemOf(planId))}
                replanPending={isReplanPending(planItemOf(planId))}
                showDetailLink
              />
            </SectionErrorBoundary>
          ))}
          {confirmPlanIds.length > CONFIRM_CARD_LIMIT && (
            <Link href={SHIPPER_PATHS.PLANS} className="m2-btn m2-btn-sec self-start">
              확인할 계획 {confirmPlanIds.length - CONFIRM_CARD_LIMIT}건 더 보기
            </Link>
          )}
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
          {!needsOnboarding && (
            <LossDisclosureCard
              lots={lots.data}
              isError={lots.isError}
              catalog={catalog.data ?? null}
            />
          )}
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
              {needsOnboarding ? (
                <EmptyState
                  title="출하 등록은 선과장 등록 뒤에 열립니다"
                  description="위에서 선과장 등록을 마치면 이 자리에서 바로 출하를 올릴 수 있어요."
                />
              ) : (
                <EmptyState
                  title="조직에 등록된 화주 · 선과장 정보가 없습니다"
                  description="플랫폼에 화주 프로필과 선과장 등록을 요청하세요."
                />
              )}
            </div>
          )}
          {catalog.data && catalog.data.shippers.length > 0 && (
            <ShipperLotForm
              key={`${orgId}:${catalog.data.id}:${preferredProductIds.join(',')}`}
              id={NEW_LOT_ANCHOR}
              catalog={catalog.data}
              preferredProductIds={preferredProductIds}
            />
          )}
        </SectionErrorBoundary>
      </div>
    </MapLinkProvider>
  );
}
