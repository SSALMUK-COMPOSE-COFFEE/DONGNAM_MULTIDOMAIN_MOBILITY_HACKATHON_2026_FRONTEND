'use client';

import { cn } from 'cn';
import type { ReactNode } from 'react';

import {
  dayTime,
  hourMinute,
  monthDay,
  monthDayTime,
} from '@/app/(saas)/app/forwarder/_components/format';
import { sortedRuns } from '@/app/(saas)/app/forwarder/_components/route-cards';
import {
  containerKind,
  productCondition,
  productName,
  usedContainers,
} from '@/app/(saas)/app/forwarder/_components/voyage-model';
import { type MapSceneT, shortPlaceName } from '@/components/map-hero/scene';
import { useMapLinkTarget } from '@/components/map-link';
import type { ForwarderPlanSessionT } from '@/types/saas-forwarder';

type PrepItemT = { key: string; title: ReactNode; sub: ReactNode; keys: string[] };

type PlanChecklistPropsT = {
  session: ForwarderPlanSessionT;
  scene: MapSceneT;
};

export function PlanChecklist({ session, scene }: PlanChecklistPropsT) {
  const { scenario, plan } = session;
  const portKey = scene.port?.key ?? null;
  const lane = scene.seaLane;
  const productLots = (containerId: string) =>
    plan.assignments.filter(
      ({ container_id, mode }) => mode === 'sea' && container_id === containerId
    );

  const items: PrepItemT[] = [
    ...usedContainers(session).map(container => {
      const kind = containerKind(scenario, container.container_id);
      const conditions = [
        ...new Set(container.product_ids.map(id => productCondition(scenario, id)).filter(Boolean)),
      ];
      return {
        key: `ct:${container.container_id}`,
        title: [`${container.container_id}${kind ? ` ${kind}` : ''} 확보`, conditions.join(' / ')]
          .filter(Boolean)
          .join(' · '),
        sub: `${container.product_ids.map(id => productName(scenario, id)).join(' · ')} ${container.pallets}P · 로트 ${productLots(container.container_id).length}건`,
        keys: [container.container_id, ...(portKey ? [portKey] : [])],
      };
    }),
    ...sortedRuns(scene).map(run => ({
      key: `run:${run.voyageId}|${run.key}`,
      title: `${run.label} 배차 · ${run.stops.map(stop => `${shortPlaceName(stop.name)} ${stop.pallets}P`).join(' → ')}`,
      sub: `${monthDay(run.departAt)} 출발 ${hourMinute(run.departAt)} · 도착 예정 ${monthDayTime(run.portEta)}`,
      keys: [run.key, ...run.stopKeys],
    })),
    ...(lane
      ? [
          {
            key: `cy:${lane.key}`,
            title: `CY 반입 · ${lane.terminal || scene.port?.name || lane.originId}`,
            sub: `${dayTime(lane.cyCutoff)} 마감 · ${lane.vesselName} ETD ${dayTime(lane.etd)}`,
            keys: [...(portKey ? [portKey] : []), lane.key],
          },
        ]
      : []),
    ...scene.air.map(item => ({
      key: item.key,
      title: `${item.name} ${item.pallets}P 항공 전환`,
      sub: item.readyDate
        ? `준비 ${monthDay(item.readyDate)} · 로트 ${item.lotId}`
        : `로트 ${item.lotId}`,
      keys: [item.key, item.lotId, 'air', ...(item.packhouseId ? [item.packhouseId] : [])],
    })),
  ];

  return (
    <section className="m2-card">
      <div className="m2-card-h items-start">
        <div className="min-w-0">
          <h2 className="m2-h2">실행 지시</h2>
          <div className="m2-sub">실행 지시 없음 — 재최적화가 적용되면 여기에 생깁니다</div>
        </div>
        <span className="m2-chip flex-none">정산 금액 비공개</span>
      </div>
      <div className="m2-lbl mb-1">계획 기준 준비 항목</div>
      <ul className="m2-chk">
        {items.map(item => (
          <PrepRow key={item.key} item={item} />
        ))}
      </ul>
      <div className="m2-cfoot">
        <span className="m2-num">
          <b>{items.length}</b> <span className="text-[13px] text-m2-muted">항목</span>
        </span>
        <span className="text-[12.5px] text-m2-muted">완료 여부는 기록되지 않습니다</span>
      </div>
    </section>
  );
}

function PrepRow({ item }: { item: PrepItemT }) {
  const { className: linkClass, ...link } = useMapLinkTarget(item.keys);

  return (
    <li {...link} className={cn(linkClass)}>
      <span className="m2-dot mt-[7px] text-m2-faint" aria-hidden />
      <div className="min-w-0">
        <b>{item.title}</b>
        <small className="m2-num">{item.sub}</small>
      </div>
    </li>
  );
}
