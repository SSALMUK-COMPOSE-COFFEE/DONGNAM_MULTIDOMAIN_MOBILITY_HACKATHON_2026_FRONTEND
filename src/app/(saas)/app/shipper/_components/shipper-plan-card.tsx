'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';

import { toastSaasError } from '@/apis/saas/errors';
import { postShipperOrderConfirm, useInvalidateShipperPlan } from '@/apis/saas/shipper';
import type { MyPlanT, OwnScopeT } from '@/app/(saas)/app/shipper/_components/my-plan';
import {
  fmtCount,
  fmtDayTime,
  fmtMonthDay,
  fmtMonthDayTime,
  fmtSignedWon,
  fmtWon,
} from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { CompareBars, M2_COLORS, SlotBar } from '@/components/map-hero';
import { useMapLinkTarget } from '@/components/map-link';
import type { ShipperOrderT } from '@/types/saas-shipper';
import { planSessionLabel } from '@/utils/plan-label';

export type PendingConfirmationT = {
  order: ShipperOrderT;
  confirmation: ShipperOrderT['shipper_confirmations'][number];
};

const OTHER_SLOT_COLOR = '#c3c9d2';

const headlineOf = ({ products, seaPallets, airPallets, voyage }: MyPlanT) => {
  const names = products.map(({ name }) => name).join('·') || '내 출하';

  if (seaPallets > 0 && voyage) {
    return `${names} ${fmtCount(seaPallets)}팔레트가 ${fmtMonthDay(voyage.etd)} ${voyage.vessel_name}에 실립니다`;
  }
  if (airPallets > 0) return `${names} ${fmtCount(airPallets)}팔레트는 항공으로 보냅니다`;

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
          {fmtCount(container.pallets)} / {fmtCount(container.capacity_pallets)} 팔레트
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

type ShipperPlanCardPropsT = {
  myPlan: MyPlanT;
  own: OwnScopeT;
  pending: PendingConfirmationT[] | null;
  showDetailLink?: boolean;
};

export function ShipperPlanCard({
  myPlan,
  own,
  pending,
  showDetailLink = true,
}: ShipperPlanCardPropsT) {
  const { session, settlement, firstStop, tariffs } = myPlan;
  const planId = session.plan_id;
  const invalidatePlan = useInvalidateShipperPlan();
  const confirm = useMutation({
    mutationFn: (items: PendingConfirmationT[]) =>
      Promise.all(
        items.map(({ order, confirmation }) =>
          postShipperOrderConfirm(planId, order.order_id, {
            accept: true,
            note: null,
            shipper_id: confirmation.shipper_id,
          })
        )
      ),
    onSuccess: () => {
      toast.success('계획을 확정했습니다.');
    },
    onSettled: () => {
      invalidatePlan(planId);
    },
    onError: toastSaasError('계획을 확정하지 못했습니다.'),
  });

  const items = pending ?? [];
  const ordersKnown = pending !== null;
  const isPending = items.length > 0;
  const waitingOthers = ordersKnown && !isPending && session.status === 'pending_confirmation';
  const isConfirmed = ordersKnown && !isPending && !waitingOthers;
  const truckNote = firstStop
    ? `집하 트럭 ${firstStop.run.label}가 ${fmtMonthDayTime(firstStop.stop.eta)}에 들릅니다.`
    : '';
  const condition = conditionOf(myPlan);

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
          {waitingOthers && <span className="m2-chip m2-chip-warn">다른 화주 확정 대기</span>}
          {isConfirmed && (
            <span className="m2-chip m2-chip-ok">
              <span className="m2-dot" />
              확정됨
            </span>
          )}
          <span className="m2-sub mt-0 truncate">
            {planSessionLabel(session)} · v{session.version}
          </span>
        </div>
      </div>

      <h2 className="m2-h2 text-[18px]">{headlineOf(myPlan)}</h2>
      {condition && <div className="m2-sub">{condition}</div>}

      {items.map(({ order, confirmation }) => (
        <div key={`${order.order_id}:${confirmation.shipper_id}`} className="m2-note">
          <div className="flex min-w-0 flex-col gap-0.5">
            <b className="font-semibold">
              {confirmation.reason_text.join(' · ') || '계획이 바뀌었습니다'}
            </b>
            <span className="m2-num">
              내 부담 {fmtSignedWon(confirmation.net_cost_delta)} · 기한{' '}
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
            { label: '항공 단독', value: fmtWon(settlement.baseline), ratio: 1, tone: 'base' },
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
          팔레트당 {fmtWon(tariff.air_total)} → {fmtWon(tariff.sea_total)}
          {tariff.assumed_items.length > 0 ? ' · 일부 비용 항목은 가정' : ''}
        </div>
      ))}

      <div className="m2-cfoot max-[720px]:flex-col max-[720px]:items-stretch">
        <div className="m2-sub mt-0">
          {isPending && truckNote ? `확정하면 ${truckNote}` : truckNote}
        </div>
        <div className="flex flex-none gap-2">
          {showDetailLink && (
            <Link href={SHIPPER_PATHS.PLAN(planId)} className="m2-btn m2-btn-sec">
              계획 상세
            </Link>
          )}
          {isPending && (
            <button
              type="button"
              className="m2-btn m2-btn-pri"
              disabled={confirm.isPending}
              onClick={() => confirm.mutate(items)}
            >
              {confirm.isPending ? '확정 중' : '계획 확정하기'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
