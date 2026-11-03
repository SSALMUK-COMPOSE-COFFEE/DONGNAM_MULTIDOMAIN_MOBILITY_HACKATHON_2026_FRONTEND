'use client';

import { cn } from 'cn';

import type { MyPlanT } from '@/app/(saas)/app/shipper/_components/my-plan';
import {
  fmtCount,
  fmtDay,
  fmtDayTime,
  fmtMonthDay,
  fmtMonthDayTime,
  fmtWon,
  timeOf,
} from '@/app/(saas)/app/shipper/_components/shipper-format';
import { HeroPanel, MapHero, type ScenePlaceT } from '@/components/map-hero';
import { useMapLinkTarget } from '@/components/map-link';

type JourneyCellT = {
  key: string;
  at: string;
  title: string;
  desc: string;
  keys: string[];
};

const journeyOf = ({ firstStop, voyage, scene, container, destinationName, sellBy }: MyPlanT) => {
  const cells: JourneyCellT[] = [];
  const containerId = container?.container_id ?? null;

  if (firstStop) {
    cells.push({
      key: 'load',
      at: firstStop.stop.eta,
      title: fmtDayTime(firstStop.stop.eta),
      desc: `${firstStop.stop.name}에서 ${firstStop.stop.pallets}팔레트 상차`,
      keys: [firstStop.stop.packhouseId, firstStop.run.key],
    });
    cells.push({
      key: 'gate',
      at: firstStop.run.portEta,
      title: fmtDayTime(firstStop.run.portEta),
      desc: [`${scene.port?.name ?? '항구'} 반입`, containerId ? `${containerId} 적재` : '']
        .filter(Boolean)
        .join(' · '),
      keys: [scene.port?.key ?? '', containerId ?? ''].filter(Boolean),
    });
  }
  if (voyage) {
    cells.push({
      key: 'etd',
      at: voyage.etd,
      title: fmtDayTime(voyage.etd),
      desc: `${voyage.vessel_name} 출항`,
      keys: [voyage.id],
    });
  }
  if (voyage && scene.seaLane) {
    cells.push({
      key: 'arrival',
      at: scene.seaLane.arrival,
      title: fmtDay(scene.seaLane.arrival),
      desc: [`${destinationName} 도착`, sellBy ? `판매기한 ${fmtMonthDay(sellBy)}` : '']
        .filter(Boolean)
        .join(' · '),
      keys: [voyage.id, voyage.destination],
    });
  }

  return cells;
};

function JourneyStep({ cell, isNow }: { cell: JourneyCellT; isNow: boolean }) {
  const { className: linkClassName, ...link } = useMapLinkTarget(cell.keys);

  return (
    <button
      type="button"
      {...link}
      className={cn('m2-jstep min-w-0', isNow && 'is-now', linkClassName)}
    >
      <div className="m2-jstep-t m2-num truncate">{cell.title}</div>
      <div className="m2-jstep-d truncate" title={cell.desc}>
        {cell.desc}
      </div>
    </button>
  );
}

function Journey({ cells, now }: { cells: JourneyCellT[]; now: number | null }) {
  if (cells.length === 0) return null;

  const nowIndex = now === null ? -1 : cells.findIndex(({ at }) => timeOf(at) > now);

  return (
    <div
      className="m2-journey max-[720px]:grid-cols-2!"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, index) => (
        <JourneyStep key={cell.key} cell={cell} isNow={index === nowIndex} />
      ))}
    </div>
  );
}

function MyPanel({ myPlan }: { myPlan: MyPlanT }) {
  const { settlement, feeRate, seaPallets, airPallets } = myPlan;

  if (!settlement) {
    return (
      <HeroPanel
        label="이 계획에 실린 내 출하"
        value={
          <>
            {fmtCount(seaPallets + airPallets)}
            <small>팔레트</small>
          </>
        }
        rows={[
          { k: '해상', v: `${fmtCount(seaPallets)}팔레트` },
          ...(airPallets > 0 ? [{ k: '항공 전환', v: `${fmtCount(airPallets)}팔레트` }] : []),
        ]}
      />
    );
  }

  return (
    <HeroPanel
      label="이 계획 절감액 (내 몫)"
      value={
        <>
          {fmtCount(Math.round(settlement.gain))}
          <small>원</small>
        </>
      }
      sub={
        feeRate === null
          ? `절감 ${fmtWon(settlement.savings)}`
          : `절감 ${fmtWon(settlement.savings)} 중 ${Math.round((1 - feeRate) * 100)}%`
      }
      rows={[
        { k: '항공 단독', v: fmtWon(settlement.baseline) },
        { k: '공동적재', v: fmtWon(settlement.shared) },
      ]}
    />
  );
}

export function ShipperMapHero({
  myPlan,
  now,
  height = 330,
}: {
  myPlan: MyPlanT;
  now: number | null;
  height?: number;
}) {
  const { scene, firstStop, container, voyage, destinationName } = myPlan;
  const containerId = container?.container_id ?? null;

  const placeSublabel = (place: ScenePlaceT) => {
    const visit = place.visits[0];
    if (!visit) return place.sublabel;

    return `${visit.sequence}번째 정차 · ${fmtMonthDayTime(visit.eta)} · ${visit.pallets}P 상차`;
  };

  return (
    <MapHero
      scene={scene}
      height={height}
      panel={<MyPanel myPlan={myPlan} />}
      hint="다른 화주는 이름·위치 비공개"
      footer={<Journey cells={journeyOf(myPlan)} now={now} />}
      placeLabel={place => `내 선과장 · ${place.name}`}
      placeSublabel={placeSublabel}
      portSublabel={
        firstStop
          ? [
              `${fmtMonthDayTime(firstStop.run.portEta)} 반입`,
              containerId ? `${containerId} 적재` : '',
            ]
              .filter(Boolean)
              .join(' · ')
          : null
      }
      seaLaneLabel={
        voyage && scene.seaLane
          ? `${voyage.vessel_name} → ${destinationName} · ${fmtMonthDay(scene.seaLane.arrival)} 도착`
          : null
      }
    />
  );
}
