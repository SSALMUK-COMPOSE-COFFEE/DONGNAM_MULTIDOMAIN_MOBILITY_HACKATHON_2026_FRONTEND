'use client';

import { cn } from 'cn';

import { MOBILE_HERO } from '@/app/(saas)/app/shipper/_components/mobile';
import {
  type MyPlanT,
  type RouteStopT,
  baselineRowLabel,
  myShareRate,
} from '@/app/(saas)/app/shipper/_components/my-plan';
import {
  fmtCount,
  fmtDay,
  fmtDayTime,
  fmtMonthDay,
  fmtMonthDayTime,
  fmtTime,
  fmtWon,
  timeOf,
} from '@/app/(saas)/app/shipper/_components/shipper-format';
import { useNarrow } from '@/app/(saas)/app/shipper/_components/use-narrow';
import { HeroPanel, MapHero, type ScenePlaceT } from '@/components/map-hero';
import { useMapLinkTarget } from '@/components/map-link';

const NARROW_FIT_INSET = 28;
const WIDE_FIT_INSET = 320;

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
      desc: `${firstStop.stop.name}에서 ${fmtCount(firstStop.stop.pallets)}파렛트 상차`,
      keys: [firstStop.stop.packhouseId, firstStop.run.key],
    });
    cells.push({
      key: 'gate',
      at: firstStop.run.portEta,
      title: fmtDayTime(firstStop.run.portEta),
      desc: [
        `${scene.port?.name ?? '항구'} 반입`,
        voyage?.cy_cutoff ? `항구 반입 마감 ${fmtMonthDayTime(voyage.cy_cutoff)}` : '',
        containerId ? `${containerId} 적재` : '',
      ]
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

export const routeStopText = ({ sequence, own, name, eta }: RouteStopT) =>
  [`${sequence}번째 정차`, own ? `내 선과장 ${name}` : '다른 화주', fmtTime(eta)].join(' · ');

function JourneyStep({ cell, isNow }: { cell: JourneyCellT; isNow: boolean }) {
  const { className: linkClassName, ...link } = useMapLinkTarget(cell.keys);

  return (
    <button
      type="button"
      {...link}
      className={cn('m2-jstep min-w-0', isNow && 'is-now', linkClassName)}
    >
      <div className="m2-jstep-t m2-num truncate">{cell.title}</div>
      <div
        className="m2-jstep-d truncate max-[767.98px]:[overflow-wrap:anywhere] max-[767.98px]:whitespace-normal"
        title={cell.desc}
      >
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
      className="m2-journey max-[767.98px]:grid-cols-2! max-[767.98px]:[&>.m2-jstep:nth-child(2n)]:border-r-0 max-[767.98px]:[&>.m2-jstep:nth-child(n+3)]:border-t max-[767.98px]:[&>.m2-jstep:nth-child(n+3)]:border-m2-line"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, index) => (
        <JourneyStep key={cell.key} cell={cell} isNow={index === nowIndex} />
      ))}
    </div>
  );
}

function RouteStops({ myPlan }: { myPlan: MyPlanT }) {
  const { routeStops, firstStop } = myPlan;
  if (!firstStop || !routeStops.some(({ own }) => !own)) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-m2-line bg-[#fbfcfd] px-4 py-2.5 text-[12px] text-m2-muted">
      <span className="font-semibold text-m2-ink-2">트럭 {firstStop.run.label} 집하 순서</span>
      <ol className="m2-num flex flex-wrap gap-x-3 gap-y-1">
        {routeStops.map(stop => (
          <li key={stop.key} className={cn(stop.own && 'font-semibold text-m2-ink')}>
            {routeStopText(stop)}
          </li>
        ))}
      </ol>
    </div>
  );
}

function MyPanel({ myPlan }: { myPlan: MyPlanT }) {
  const { settlement, seaPallets, airPallets } = myPlan;

  if (!settlement) {
    return (
      <HeroPanel
        label="이 계획에 실린 내 출하"
        value={
          <>
            {fmtCount(seaPallets + airPallets)}
            <small>파렛트</small>
          </>
        }
        rows={[
          { k: '해상', v: `${fmtCount(seaPallets)}파렛트` },
          ...(airPallets > 0 ? [{ k: '항공 전환', v: `${fmtCount(airPallets)}파렛트` }] : []),
        ]}
      />
    );
  }

  const basis = settlement.baselineLabel ? ` (${settlement.baselineLabel})` : '';
  const share = myShareRate(settlement);
  const saved = `절감 ${fmtWon(settlement.savings)}${basis}`;

  return (
    <HeroPanel
      label="이 계획 절감액 (내 몫)"
      value={
        <>
          {fmtCount(Math.round(settlement.gain))}
          <small>원</small>
        </>
      }
      sub={share === null ? saved : `${saved} 중 ${Math.round(share * 100)}%`}
      rows={[
        { k: baselineRowLabel(settlement), v: fmtWon(settlement.baseline) },
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
  const narrow = useNarrow();
  const { scene, firstStop, container, voyage, destinationName, routeStops } = myPlan;
  const containerId = container?.container_id ?? null;
  const otherStops = routeStops.filter(({ own }) => !own).length;

  const placeSublabel = (place: ScenePlaceT) => {
    const visit = place.visits[0];
    if (!visit) return place.sublabel;

    return `${visit.sequence}번째 정차 · ${fmtMonthDayTime(visit.eta)} · ${fmtCount(visit.pallets)}파렛트 상차`;
  };

  return (
    <MapHero
      scene={scene}
      height={height}
      className={MOBILE_HERO}
      fitInsetLeft={narrow ? NARROW_FIT_INSET : WIDE_FIT_INSET}
      panel={<MyPanel myPlan={myPlan} />}
      hint={
        otherStops > 0
          ? `같은 트럭이 다른 화주 ${otherStops}곳에 들릅니다 · 이름·위치 비공개`
          : '다른 화주는 이름·위치 비공개'
      }
      footer={
        <>
          <Journey cells={journeyOf(myPlan)} now={now} />
          <RouteStops myPlan={myPlan} />
        </>
      }
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
