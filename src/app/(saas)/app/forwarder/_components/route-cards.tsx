'use client';

import { cn } from 'cn';
import { Fragment } from 'react';

import {
  formatKm,
  formatMinutes,
  hourMinute,
  monthDay,
} from '@/app/(saas)/app/forwarder/_components/format';
import {
  lotProductIds,
  productName,
  shortPortName,
} from '@/app/(saas)/app/forwarder/_components/voyage-model';
import { type MapSceneT, type SceneRunT, shortPlaceName } from '@/components/map-hero/scene';
import { useMapLinkTarget } from '@/components/map-link';
import type { ForwarderPlanSessionT } from '@/types/saas-forwarder';

type RouteCardsPropsT = {
  session: ForwarderPlanSessionT;
  scene: MapSceneT;
};

export const sortedRuns = (scene: MapSceneT) =>
  [...scene.runs].sort(
    (a, b) => Date.parse(a.departAt) - Date.parse(b.departAt) || a.key.localeCompare(b.key)
  );

const gateText = (run: SceneRunT) => {
  if (run.gateStatus === 'avoided') {
    return {
      text: `게이트 혼잡${run.gateWindow ? ` ${run.gateWindow}` : ''} 회피 +${run.gateDelayMinutes}분`,
      warn: true,
    };
  }
  if (run.gateStatus === 'peak') {
    return {
      text: `게이트 혼잡${run.gateWindow ? ` ${run.gateWindow}` : ''} 시간 도착`,
      warn: true,
    };
  }

  return { text: '게이트 비혼잡', warn: false };
};

export function RouteCards({ session, scene }: RouteCardsPropsT) {
  const runs = sortedRuns(scene);
  const totalKm = session.routes.reduce((sum, { pickup }) => sum + pickup.total_km, 0);
  const hasGrape = runs.some(({ tone }) => tone === 'grape');
  const hasBerry = runs.some(({ tone }) => tone === 'berry');
  const assumptions = [...new Set(session.routes.flatMap(({ pickup }) => pickup.assumptions))];
  const dropped = session.routes.flatMap(({ pickup }) => pickup.dropped_stop_ids);

  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">집하 경로</h2>
          <div className="m2-sub m2-num">
            {runs.length}운행 · {formatKm(totalKm)}
            {hasGrape && hasBerry ? ' · SO₂ 처리 품목은 다른 품목과 같은 트럭에 싣지 않음' : ''}
          </div>
        </div>
      </div>

      {runs.length === 0 ? (
        <p className="m2-sub">이 계획에는 트럭 집하 경로가 없습니다.</p>
      ) : (
        runs.map(run => (
          <RouteCard
            key={`${run.voyageId}|${run.key}`}
            run={run}
            session={session}
            portLabel={shortPortName(scene.port?.name ?? '항구')}
          />
        ))
      )}

      {dropped.length > 0 ? (
        <div className="m2-note m2-note-warn">
          집하하지 못한 정차지 {dropped.length}곳: {dropped.join(', ')}
        </div>
      ) : null}

      {assumptions.length > 0 ? (
        <details className="mt-3 text-[11.5px] text-m2-muted">
          <summary className="cursor-pointer font-semibold">
            계산 가정 {assumptions.length}개
          </summary>
          <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
            {assumptions.map(text => (
              <li key={text}>{text.replace(/^(가정|규칙):\s*/, '')}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

type RouteCardPropsT = {
  run: SceneRunT;
  session: ForwarderPlanSessionT;
  portLabel: string;
};

function RouteCard({ run, session, portLabel }: RouteCardPropsT) {
  const { className: linkClass, ...link } = useMapLinkTarget([run.key, ...run.stopKeys]);
  const productIds = lotProductIds(session.scenario, run.lotIds);
  const cargo = productIds.map(id => productName(session.scenario, id)).join('·');
  const lastStop = run.stops.at(-1) ?? null;
  const gate = gateText(run);

  return (
    <article
      {...link}
      tabIndex={0}
      aria-label={`${run.label} 운행`}
      className={cn('m2-rt', linkClass)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <b className="m2-mono text-[13px]">{run.truckId}</b>
        {run.tripCount > 1 ? <span className="m2-chip">{run.trip}회차</span> : null}
        {cargo ? (
          <span className={cn('m2-chip', run.tone === 'grape' ? 'm2-chip-grape' : 'm2-chip-berry')}>
            {cargo}
            {run.containerIds.length > 0 ? ` → ${run.containerIds.join('·')}` : ''}
          </span>
        ) : null}
        <span className="m2-num ml-auto text-[12px] text-m2-muted">
          {monthDay(run.departAt)} · {run.loadPallets} / {run.capacity}P
        </span>
      </div>

      <div className="my-2 flex flex-wrap items-center gap-1.5 text-[13px]">
        <PortBadge label={portLabel} />
        {run.stops.map(stop => (
          <Fragment key={stop.key}>
            <span aria-hidden>→</span>
            <span
              className="inline-grid size-5 place-items-center rounded-full text-[11px] font-bold text-white"
              style={{ background: run.color }}
              aria-hidden
            >
              {stop.sequence}
            </span>
            <span>
              {shortPlaceName(stop.name)} {stop.pallets}P
            </span>
          </Fragment>
        ))}
        <span aria-hidden>→</span>
        <PortBadge label={portLabel} />
      </div>

      <div className="m2-num text-[12px] text-m2-muted">
        {formatKm(run.km)} · 출발 {hourMinute(run.departAt)}
        {lastStop
          ? ` · ${shortPlaceName(lastStop.name)} 상차 ${hourMinute(lastStop.eta)}`
          : ''} · {portLabel} 도착 <b className="text-m2-ink">{hourMinute(run.portEta)}</b> · 여유{' '}
        {formatMinutes(run.slack)}분 ·{' '}
        <span className={gate.warn ? 'text-m2-warn-ink' : ''}>{gate.text}</span>
      </div>
    </article>
  );
}

function PortBadge({ label }: { label: string }) {
  return (
    <span className="rounded-[5px] bg-m2-ink px-[5px] py-px text-[11px] font-bold text-white">
      {label}
    </span>
  );
}
