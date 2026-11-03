'use client';

import { cn } from 'cn';
import type { ReactNode } from 'react';

import {
  ColdchainChart,
  type ColdchainEventT,
  EVENT_COLOR,
} from '@/app/(saas)/app/forwarder/_components/coldchain-chart';
import { formatMinutes, hourMinute } from '@/app/(saas)/app/forwarder/_components/format';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import type { ForwarderTwinStateT, ForwarderTwinSummaryT } from '@/types/saas-forwarder';
import { formatPercent } from '@/utils/format';

export const TWIN_STATUS: Record<
  ForwarderTwinSummaryT['status'],
  { label: string; chip: string; color: string }
> = {
  no_data: { label: '측정값 없음', chip: 'm2-chip', color: '#a9b0ba' },
  normal: { label: '정상', chip: 'm2-chip m2-chip-ok', color: '#0f8a66' },
  warning: { label: '경고', chip: 'm2-chip m2-chip-warn', color: '#a85d00' },
  critical: { label: '위험', chip: 'm2-chip m2-chip-berry', color: '#b42318' },
};

export const NO_READING_TEXT = '기기를 연결하면 측정값이 들어옵니다.';

export const twinEvents = (twin: ForwarderTwinStateT): ColdchainEventT[] => {
  const alertActionKeys = new Set(
    twin.alerts.flatMap(({ action }) => (action ? [action.key] : []))
  );
  const fromAlerts = twin.alerts.map(alert => ({
    key: `alert:${alert.key}`,
    at: alert.at,
    level: alert.level,
    title: alert.title.replace(/^CA-\d+\s*/, ''),
  }));
  const fromActions = twin.actions
    .filter(({ key }) => !alertActionKeys.has(key))
    .map(action => ({
      key: `action:${action.key}`,
      at: action.triggered_at,
      level: action.severity,
      title: action.title,
    }));

  return [...fromAlerts, ...fromActions].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
};

export function TwinChips({ twin }: { twin: ForwarderTwinStateT }) {
  const status = TWIN_STATUS[twin.status];
  const current = twin.current;

  return (
    <>
      <span className={status.chip}>{status.label}</span>
      {current ? (
        <span className={cn('m2-chip', current.power_on ? 'm2-chip-ok' : 'm2-chip-berry')}>
          {current.power_on ? '전원 켜짐' : '전원 꺼짐'}
        </span>
      ) : null}
      {twin.device_ids.map(deviceId => (
        <span key={deviceId} className="m2-chip m2-mono">
          {deviceId}
        </span>
      ))}
      {twin.excursion.minutes_above_band > 0 ? (
        <span className="m2-chip m2-chip-warn">
          적정 초과 {formatMinutes(twin.excursion.minutes_above_band)}분
        </span>
      ) : null}
    </>
  );
}

export function TwinBody({
  twin,
  containerId,
}: {
  twin: ForwarderTwinStateT;
  containerId: string;
}) {
  const current = twin.current;
  const events = twinEvents(twin);

  if (!current || twin.timeline.length === 0) {
    return <p className="m2-sub py-6 text-center">{NO_READING_TEXT}</p>;
  }

  const peak = twin.timeline.reduce(
    (best, point) => (point.temp_c > best.temp_c ? point : best),
    twin.timeline[0]
  );
  const maxTemp = twin.excursion.max_temp_c;
  const peakAt =
    typeof maxTemp === 'number' && Math.abs(peak.temp_c - maxTemp) < 0.005 ? peak.ts : null;
  const planned = twin.loss.planned_loss_rate;
  const predicted = twin.loss.predicted_loss_rate;

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_220px] gap-5 max-[1180px]:grid-cols-1">
        <SectionErrorBoundary message="품온 그래프를 그리지 못했습니다." className="h-[200px]">
          <ColdchainChart
            containerId={containerId}
            timeline={twin.timeline}
            bandMin={twin.excursion.band_min_c}
            bandMax={twin.excursion.band_max_c}
            events={events}
          />
        </SectionErrorBoundary>
        <div className="grid grid-cols-2 content-start gap-x-3.5 gap-y-3 max-[1180px]:grid-cols-4 max-[700px]:grid-cols-2">
          <Stat
            label={`현재 품온 ${hourMinute(current.ts)}`}
            value={current.temp_c.toFixed(2)}
            unit="°C"
            isAlert={current.excursion_c > 0}
            note={`적정 ${twin.excursion.band_min_c}~${twin.excursion.band_max_c}°C`}
          />
          <Stat
            label={peakAt ? `최고 품온 ${hourMinute(peakAt)}` : '최고 품온'}
            value={typeof maxTemp === 'number' ? maxTemp.toFixed(2) : '–'}
            unit="°C"
            isAlert={twin.excursion.minutes_above_band > 0}
            note={`적정 초과 ${formatMinutes(twin.excursion.minutes_above_band)}분`}
          />
          <Stat
            label="누적 단전"
            value={formatMinutes(twin.outage.cumulative_minutes)}
            unit={`분 · ${twin.outage.episodes}회`}
            isAlert={twin.outage.cumulative_minutes > 0}
            note={`실증 노선 ${formatMinutes(twin.outage.reference_minutes)}분`}
          />
          <Stat
            label="보험 기준"
            value={formatMinutes(twin.outage.insurance_threshold_minutes)}
            unit="분"
            note={twin.outage.insurance_eligible ? '보험 청구 기준 넘음' : '기준 미만'}
          />
          <div className="col-span-full">
            <div className="m2-lbl">
              {typeof planned === 'number' ? '예상 손실률 (계획 → 센서)' : '센서 기준 손실률'}
            </div>
            <div className="m2-num text-[20px] font-bold tracking-[-0.02em]">
              {typeof planned === 'number'
                ? `${formatPercent(planned)} → ${formatPercent(twin.loss.sensor_loss_rate)}`
                : formatPercent(twin.loss.sensor_loss_rate)}
            </div>
            <div className="m2-num text-[11.5px] text-m2-muted">
              단전이 없으면 {formatPercent(twin.loss.no_outage_loss_rate)}
              {typeof predicted === 'number' ? ` · 예측 ${formatPercent(predicted)}` : ''}
            </div>
          </div>
        </div>
      </div>
      <EventLog events={events} />
    </>
  );
}

type StatPropsT = {
  label: string;
  value: ReactNode;
  unit: string;
  note?: string;
  isAlert?: boolean;
};

function Stat({ label, value, unit, note, isAlert = false }: StatPropsT) {
  return (
    <div className="min-w-0">
      <div className="m2-lbl">{label}</div>
      <div
        className={cn('m2-num text-[20px] font-bold tracking-[-0.02em]', isAlert && 'text-m2-crit')}
      >
        {value}
        <small className="ml-0.5 text-[12px] font-semibold text-m2-ink-2">{unit}</small>
      </div>
      {note ? <div className="m2-num text-[11.5px] text-m2-muted">{note}</div> : null}
    </div>
  );
}

export function EventLog({ events }: { events: ColdchainEventT[] }) {
  if (events.length === 0) {
    return <p className="m2-sub mt-3.5">아직 조치·알림 이벤트가 없습니다.</p>;
  }

  return (
    <ol className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-x-4 gap-y-1.5 text-[12px]">
      {events.map((event, index) => (
        <li key={event.key} className="flex min-w-0 items-center gap-2">
          <span
            className="grid size-4 flex-none place-items-center rounded-[4px] text-[10px] font-bold text-white"
            style={{ background: EVENT_COLOR[event.level] }}
          >
            {index + 1}
          </span>
          <time className="m2-num flex-none text-m2-muted">{hourMinute(event.at)}</time>
          <span className="truncate" title={event.title}>
            {event.title}
          </span>
        </li>
      ))}
    </ol>
  );
}
