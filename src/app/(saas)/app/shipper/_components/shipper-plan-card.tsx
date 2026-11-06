'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { useShipperOrgId } from '@/apis/saas/shipper';
import {
  type ShipperConfirmationViewT,
  isReplanPending,
  shipperPlanConfirmationQueryOptions,
} from '@/apis/saas/shipper-confirm';
import {
  CONFIRM_WAIT_LABEL,
  type ConfirmWaitT,
  type MyPlanT,
  type OwnPlanConfirmT,
  type OwnScopeT,
  baselineRowLabel,
  confirmWaitOf,
  isAwaitingShippers,
} from '@/app/(saas)/app/shipper/_components/my-plan';
import {
  DecisionButtons,
  type PendingConfirmationT,
  RejectForm,
  useOrderDecision,
} from '@/app/(saas)/app/shipper/_components/order-decision';
import { plainWords } from '@/app/(saas)/app/shipper/_components/plain-words';
import {
  fmtBurden,
  fmtCount,
  fmtDayTime,
  fmtMonthDay,
  fmtMonthDayTime,
  fmtWon,
} from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { CompareBars, M2_COLORS, SlotBar } from '@/components/map-hero';
import { useMapLinkTarget } from '@/components/map-link';
import type { ShipperOrderT } from '@/types/saas-shipper';
import { planSessionLabel } from '@/utils/plan-label';

export type { PendingConfirmationT } from '@/app/(saas)/app/shipper/_components/order-decision';

const OTHER_SLOT_COLOR = '#c3c9d2';

const otherVoyagesText = ({ otherVoyages }: MyPlanT) =>
  otherVoyages
    .map(({ voyage, voyageId, pallets }) => {
      const where = voyage ? `${voyage.vessel_name} ${fmtMonthDay(voyage.etd)}` : voyageId;

      return `외 ${fmtCount(pallets)}파렛트는 ${where}`;
    })
    .join(', ');

const headlineOf = (myPlan: MyPlanT) => {
  const { products, firstVoyagePallets, airPallets, voyage } = myPlan;
  const names = products.map(({ name }) => name).join('·') || '내 출하';

  if (firstVoyagePallets > 0 && voyage) {
    const head = `${names} ${fmtCount(firstVoyagePallets)}파렛트가 ${fmtMonthDay(voyage.etd)} ${voyage.vessel_name}에 실립니다`;
    const others = otherVoyagesText(myPlan);

    return others ? `${head} · ${others}` : head;
  }
  if (airPallets > 0) return `${names} ${fmtCount(airPallets)}파렛트는 항공으로 보냅니다`;

  return '이 계획에 실린 내 출하가 없습니다';
};

const conditionOf = ({ container, containerKind, products, otherShipperCount }: MyPlanT) => {
  if (!container) return '';
  const product = products.find(({ id }) => container.product_ids.includes(id)) ?? products[0];
  const spec = product
    ? [
        `${product.temp_min_c}~${product.temp_max_c}°C`,
        typeof product.o2_pct === 'number' ? `O₂ ${product.o2_pct}%` : '',
        typeof product.co2_pct === 'number' ? `CO₂ ${product.co2_pct}%` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const head = [container.container_id, containerKind].filter(Boolean).join(' ');
  const together =
    otherShipperCount > 0 ? `다른 화주 ${otherShipperCount}곳의 화물과 함께` : '내 화물만 실림';

  return [spec ? `${head} (${spec})` : head, together].join(' · ');
};

function ContainerSlots({ myPlan, own }: { myPlan: MyPlanT; own: OwnScopeT }) {
  const { container, myContainerPallets, scene } = myPlan;
  const keys = [...own.packhouseIds, container?.container_id ?? ''];
  const { className: linkClassName, ...link } = useMapLinkTarget(keys);

  if (!container) return null;

  const tone = scene.containers.find(({ key }) => key === container.container_id)?.color;
  const others = Math.max(container.pallets - myContainerPallets, 0);

  return (
    <div {...link} className={`m2-block mt-3.5 ${linkClassName}`}>
      <div className="flex items-baseline justify-between gap-2.5">
        <h3 className="m2-h3">컨테이너 안 내 자리</h3>
        <span className="m2-kv m2-num">
          {fmtCount(container.pallets)} / {fmtCount(container.capacity_pallets)} 파렛트
        </span>
      </div>
      <SlotBar
        capacity={container.capacity_pallets}
        segments={[
          {
            key: 'mine',
            pallets: myContainerPallets,
            color: tone ?? M2_COLORS.berry,
            label: '내 화물',
          },
          { key: 'others', pallets: others, color: OTHER_SLOT_COLOR, label: '다른 화주' },
        ]}
      />
    </div>
  );
}

const ownPlanConfirmOf = (
  view: ShipperConfirmationViewT,
  replanPending: boolean,
  own: OwnScopeT
): OwnPlanConfirmT => {
  if (replanPending || isReplanPending(view)) return 'replanning';
  const ownShippers = new Set(own.shipperIds);
  const rows = view.confirmations.filter(({ shipper_id }) => ownShippers.has(shipper_id));

  if (rows.some(({ status }) => status === 'pending')) return 'pending';
  if (rows.some(({ status }) => status === 'rejected')) return 'rejected';

  return 'none';
};

const WAIT_CHIP_CLASS: Partial<Record<Exclude<ConfirmWaitT, null>, string>> = {
  mine: 'm2-chip m2-chip-brand',
  rejected: 'm2-chip m2-chip-berry',
  replanning: 'm2-chip',
};

const mineNoteOf = (wait: ConfirmWaitT, showDetailLink: boolean) => {
  if (wait !== 'mine') return '';
  if (showDetailLink) return ' 수락·거절은 계획 상세에서 합니다.';

  return ' 수락·거절은 위 계획 확인 카드에서 합니다.';
};

type ShipperPlanCardPropsT = {
  myPlan: MyPlanT;
  own: OwnScopeT;
  pending: PendingConfirmationT[] | null;
  orders: ShipperOrderT[] | null;
  showDetailLink?: boolean;
  showDecision?: boolean;
};

export function ShipperPlanCard({
  myPlan,
  own,
  pending,
  orders,
  showDetailLink = true,
  showDecision = true,
}: ShipperPlanCardPropsT) {
  const { session, settlement, firstStop, tariffs } = myPlan;
  const planId = session.plan_id;
  const items = pending ?? [];
  const decision = useOrderDecision(planId, showDecision ? items : []);
  const ordersKnown = pending !== null && orders !== null;
  const isPending = items.length > 0;
  const awaitingShippers = isAwaitingShippers(session);
  const orgId = useShipperOrgId();
  const planConfirmation = useQuery({
    ...shipperPlanConfirmationQueryOptions(orgId, planId),
    enabled: awaitingShippers && !!orgId && !!planId,
  });
  const ownPlanKnown = !awaitingShippers || planConfirmation.isSuccess;
  const ownPlan =
    awaitingShippers && planConfirmation.isSuccess
      ? ownPlanConfirmOf(planConfirmation.data, isReplanPending(session), own)
      : 'none';
  const wait =
    ordersKnown && ownPlanKnown ? confirmWaitOf(session, orders, items.length, ownPlan) : null;
  const isConfirmed = ordersKnown && ownPlanKnown && !isPending && wait === null;
  const truckNote = firstStop
    ? `집하 트럭 ${firstStop.run.label}가 ${fmtMonthDayTime(firstStop.stop.eta)}에 들릅니다.`
    : '';
  const condition = plainWords(conditionOf(myPlan));

  return (
    <section
      className="m2-card"
      style={isPending ? { boxShadow: '0 0 0 1.5px rgba(26,123,255,.35)' } : {}}
      aria-label="내 계획"
    >
      <div className="m2-card-h">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {isPending && (
            <span className="m2-chip m2-chip-brand">
              <span className="m2-dot" />
              확정 대기
            </span>
          )}
          {wait && (
            <span className={WAIT_CHIP_CLASS[wait] ?? 'm2-chip m2-chip-warn'}>
              {wait === 'mine' && <span className="m2-dot" />}
              {CONFIRM_WAIT_LABEL[wait]}
            </span>
          )}
          {isConfirmed && (
            <span className="m2-chip m2-chip-ok">
              <span className="m2-dot" />
              확정됨
            </span>
          )}
          <span className="m2-sub mt-0 truncate">
            {planSessionLabel({ ...session, plan_id: '' })} · v{session.version}
          </span>
        </div>
      </div>

      <h2 className="m2-h2 text-[18px]">{headlineOf(myPlan)}</h2>
      {condition && <div className="m2-sub">{condition}</div>}
      {myPlan.otherVoyages.map(
        ({ voyageId, voyage, pallets, containerIds, pickupEta, truckLabel }) => (
          <div key={voyageId} className="m2-sub m2-num">
            {[
              voyage ? `${fmtMonthDay(voyage.etd)} ${voyage.vessel_name}` : voyageId,
              containerIds.join('·'),
              `${fmtCount(pallets)}파렛트`,
              pickupEta ? `집하 ${fmtMonthDayTime(pickupEta)}` : '',
              truckLabel ? `트럭 ${truckLabel}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )
      )}

      {items.map(({ order, confirmation }) => (
        <div key={`${order.order_id}:${confirmation.shipper_id}`} className="m2-note">
          <div className="flex min-w-0 flex-col gap-0.5">
            <b className="font-semibold">
              {plainWords(confirmation.reason_text.join(' · ')) || '계획이 바뀌었습니다'}
            </b>
            <span className="m2-num">
              내 비용 {fmtBurden(confirmation.net_cost_delta)} · 기한{' '}
              {fmtDayTime(confirmation.deadline)}
            </span>
          </div>
        </div>
      ))}

      <ContainerSlots myPlan={myPlan} own={own} />

      {settlement && settlement.baseline > 0 && (
        <CompareBars
          className="mt-3.5"
          rows={[
            {
              label: baselineRowLabel(settlement),
              value: fmtWon(settlement.baseline),
              ratio: 1,
              tone: 'base',
            },
            {
              label: '공동적재',
              value: fmtWon(settlement.shared),
              ratio: settlement.shared / settlement.baseline,
              tone: 'navy',
            },
          ]}
        />
      )}

      {tariffs.map(tariff => (
        <div key={tariff.product_id} className="m2-sub text-[12px]">
          파렛트당 {fmtWon(tariff.air_total)} → {fmtWon(tariff.sea_total)}
          {tariff.assumed_items.length > 0 ? ' · 일부 비용 항목은 가정' : ''}
        </div>
      ))}

      <div className="m2-cfoot max-[767.98px]:flex-col max-[767.98px]:items-stretch">
        <div className="m2-sub mt-0">
          {isPending && truckNote ? `확정하면 ${truckNote}` : truckNote}
          {isPending && !showDecision ? ' 수락·거절은 아래 실행 지시에서 지시마다 합니다.' : ''}
          {mineNoteOf(wait, showDetailLink)}
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          {showDetailLink && (
            <Link href={SHIPPER_PATHS.PLAN(planId)} className="m2-btn m2-btn-sec">
              계획 상세
            </Link>
          )}
          <DecisionButtons decision={decision} />
        </div>
      </div>
      <RejectForm decision={decision} />
    </section>
  );
}
