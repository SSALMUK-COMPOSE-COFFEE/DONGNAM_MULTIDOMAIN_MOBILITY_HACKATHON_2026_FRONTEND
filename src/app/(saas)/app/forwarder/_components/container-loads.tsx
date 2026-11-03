'use client';

import { cn } from 'cn';
import { PlaneIcon } from 'lucide-react';

import {
  containerKind,
  isSo2Product,
  productCondition,
  productName,
  usedContainers,
} from '@/app/(saas)/app/forwarder/_components/voyage-model';
import { SlotBar } from '@/components/map-hero/parts';
import { useMapLinkTarget } from '@/components/map-link';
import type { ForwarderPlanSessionT } from '@/types/saas-forwarder';
import { getShipperShortName } from '@/utils/scenario';

const BERRY_SHADES = ['#d93a40', '#ec8d90', '#f6c2c4', '#a8262b'];
const GRAPE_SHADES = ['#6047d1', '#a597ea', '#cfc6f5', '#4a33b5'];

type ContainerLoadT = ForwarderPlanSessionT['plan']['containers'][number];

export function ContainerLoadsCard({ session }: { session: ForwarderPlanSessionT }) {
  const containers = usedContainers(session);
  const air = session.plan.assignments.filter(({ mode }) => mode === 'air');
  const hasSo2 = containers.some(({ product_ids }) =>
    product_ids.some(id => isSo2Product(session.scenario, id))
  );
  const specs = [
    ...new Set(
      containers.map(({ container_id, capacity_pallets }) =>
        [containerKind(session.scenario, container_id), `${capacity_pallets}파렛트`]
          .filter(Boolean)
          .join(' · ')
      )
    ),
  ];
  const sharedSpec = specs.length === 1 ? specs[0] : null;

  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">컨테이너 적재</h2>
          <div className="m2-sub">컨테이너마다 화주별 파렛트 칸</div>
        </div>
        {sharedSpec ? <span className="m2-chip">{sharedSpec}</span> : null}
      </div>

      {containers.length === 0 ? (
        <p className="m2-sub">이 계획에는 사용하는 컨테이너가 없습니다.</p>
      ) : (
        containers.map(container => (
          <ContainerBlock
            key={container.container_id}
            container={container}
            session={session}
            showKind={!sharedSpec}
          />
        ))
      )}

      {air.length > 0 ? <AirBlock session={session} /> : null}

      {hasSo2 ? (
        <div className="m2-note m2-note-grape">
          SO₂ 처리 품목은 다른 품목과 같은 컨테이너·같은 트럭에 싣지 않습니다.
        </div>
      ) : null}
    </section>
  );
}

function ContainerBlock({
  container,
  session,
  showKind,
}: {
  container: ContainerLoadT;
  session: ForwarderPlanSessionT;
  showKind: boolean;
}) {
  const { className: linkClass, ...link } = useMapLinkTarget([container.container_id]);
  const { scenario, plan } = session;
  const so2 = container.product_ids.some(id => isSo2Product(scenario, id));
  const shades = so2 ? GRAPE_SHADES : BERRY_SHADES;
  const palletsByShipper = new Map<string, number>();
  plan.assignments
    .filter(({ container_id, mode }) => mode === 'sea' && container_id === container.container_id)
    .forEach(({ shipper_id, pallets }) =>
      palletsByShipper.set(shipper_id, (palletsByShipper.get(shipper_id) ?? 0) + pallets)
    );
  const segments = [...palletsByShipper].map(([shipperId, pallets], index) => ({
    key: shipperId,
    pallets,
    color: shades[index % shades.length],
    label: getShipperShortName(scenario, shipperId),
  }));
  const ratio = container.capacity_pallets > 0 ? container.pallets / container.capacity_pallets : 0;
  const conditions = [
    ...new Set(container.product_ids.map(id => productCondition(scenario, id)).filter(Boolean)),
  ];
  const kind = showKind ? containerKind(scenario, container.container_id) : null;

  return (
    <div {...link} tabIndex={0} className={cn('m2-block', linkClass)}>
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m2-h3">
            {container.container_id} ·{' '}
            {container.product_ids.map(id => productName(scenario, id)).join(' · ') ||
              '빈 컨테이너'}
          </h3>
          <div className="m2-kv mt-0.5">{[kind, ...conditions].filter(Boolean).join(' / ')}</div>
        </div>
        <div className="flex-none text-right">
          <div className="m2-num text-[20px] font-bold">{Math.round(ratio * 100)}%</div>
          <div className="m2-kv m2-num justify-end">
            {container.pallets} / {container.capacity_pallets} 파렛트
          </div>
        </div>
      </div>
      <SlotBar capacity={container.capacity_pallets} segments={segments} />
    </div>
  );
}

function AirBlock({ session }: { session: ForwarderPlanSessionT }) {
  const { scenario, plan } = session;
  const air = plan.assignments.filter(({ mode }) => mode === 'air');
  const total = air.reduce((sum, { pallets }) => sum + pallets, 0);
  const { className: linkClass, ...link } = useMapLinkTarget([
    'air',
    ...air.map(({ lot_id }) => `air:${lot_id}`),
  ]);

  return (
    <div {...link} tabIndex={0} className={cn('m2-block', linkClass)}>
      <h3 className="m2-h3 flex items-center gap-1.5">
        <PlaneIcon className="size-4 text-m2-warn" aria-hidden />
        항공 <span className="m2-num text-m2-warn-ink">{total}</span>파렛트
        <span className="text-[12px] font-medium text-m2-muted">컨테이너에 싣지 않고 항공으로</span>
      </h3>
      <ul className="mt-2 flex flex-col gap-1 text-[12.5px]">
        {air.map(({ lot_id, shipper_id, product_id, pallets }) => (
          <li key={lot_id} className="flex flex-wrap items-center gap-2">
            <b className="font-semibold">{getShipperShortName(scenario, shipper_id)}</b>
            <span>{productName(scenario, product_id)}</span>
            <span className="m2-num">{pallets}파렛트</span>
            <span className="m2-mono text-m2-muted">{lot_id}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
