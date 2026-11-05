'use client';

import { cn } from 'cn';

import { monthDayTime } from '@/app/(saas)/app/forwarder/_components/format';
import { sortedRuns } from '@/app/(saas)/app/forwarder/_components/route-cards';
import { type MapSceneT, type SceneStopT, hasPosition } from '@/components/map-hero/scene';
import { useMapLinkTarget } from '@/components/map-link';
import type { ForwarderPlanSessionT } from '@/types/saas-forwarder';
import { getShipperName } from '@/utils/scenario';

const formatCoordinate = (value: number) => value.toFixed(5);

type PickupSchedulePropsT = {
  session: ForwarderPlanSessionT;
  scene: MapSceneT;
};

export function PickupSchedule({ session, scene }: PickupSchedulePropsT) {
  const runs = sortedRuns(scene);
  const voyageName = (voyageId: string) =>
    session.scenario.voyages.find(({ id }) => id === voyageId)?.vessel_name ?? null;

  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">집하 순서 · 출하 장소 위치</h2>
          <div className="m2-sub">
            정차지별 화주·좌표·준비 시각{scene.port ? ` · 도착 ${scene.port.name}` : ''}
          </div>
        </div>
      </div>
      {runs.length === 0 ? (
        <p className="m2-sub">이 계획에는 트럭 집하 경로가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="m2-table">
            <thead>
              <tr>
                <th>운행</th>
                <th className="r">순서</th>
                <th>출하 장소 · 지역 · 좌표</th>
                <th>화주</th>
                <th className="r">파렛트</th>
                <th>준비</th>
                <th>도착 예정</th>
              </tr>
            </thead>
            <tbody>
              {runs.flatMap(run =>
                run.stops.map((stop, index) => (
                  <StopRow
                    key={`${run.voyageId}|${run.key}|${stop.key}`}
                    session={session}
                    runKey={run.key}
                    runLabel={
                      index === 0
                        ? [
                            run.label,
                            voyageName(run.voyageId),
                            `${run.loadPallets}/${run.capacity}P`,
                            `출발 ${monthDayTime(run.departAt)}~${monthDayTime(run.latestDepartAt).slice(-5)}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : ''
                    }
                    isFirst={index === 0}
                    stop={stop}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type StopRowPropsT = {
  session: ForwarderPlanSessionT;
  runKey: string;
  runLabel: string;
  isFirst: boolean;
  stop: SceneStopT;
};

function StopRow({ session, runKey, runLabel, isFirst, stop }: StopRowPropsT) {
  const { className: linkClass, ...link } = useMapLinkTarget([stop.packhouseId, runKey]);
  const { scenario } = session;
  const packhouse = scenario.packhouses.find(({ id }) => id === stop.packhouseId) ?? null;
  const shippers = [
    ...new Set(
      stop.lotIds.flatMap(lotId => {
        const lot = scenario.lots.find(({ id }) => id === lotId);
        return lot ? [getShipperName(scenario, lot.shipper_id)] : [];
      })
    ),
  ];

  return (
    <tr {...link} className={cn(linkClass)}>
      <td
        className={cn(
          'max-w-[170px] min-w-[120px] text-[12px] whitespace-normal text-m2-muted',
          !isFirst && 'border-t-transparent'
        )}
      >
        {runLabel}
      </td>
      <td className="r m2-num">{stop.sequence}</td>
      <td className="min-w-[140px] whitespace-normal">
        <p className="font-semibold">{packhouse?.name ?? stop.packhouseId}</p>
        <p className="text-[12px] text-m2-muted">
          {[
            packhouse?.region,
            packhouse && hasPosition(packhouse)
              ? `${formatCoordinate(packhouse.lat)}, ${formatCoordinate(packhouse.lon)}`
              : '',
          ]
            .filter(Boolean)
            .join(' · ') || '–'}
        </p>
      </td>
      <td className="whitespace-normal">{shippers.join(', ') || '–'}</td>
      <td className="r m2-num">
        <b>{stop.pallets}</b>
      </td>
      <td className="m2-num whitespace-nowrap">{monthDayTime(stop.readyAt)}</td>
      <td className="m2-num whitespace-nowrap">{monthDayTime(stop.eta)}</td>
    </tr>
  );
}
