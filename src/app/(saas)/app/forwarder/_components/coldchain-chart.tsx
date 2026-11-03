'use client';

import { type MouseEvent, useEffect, useId, useRef, useState } from 'react';

import { hourMinute, monthDay } from '@/app/(saas)/app/forwarder/_components/format';
import { M2_COLORS } from '@/components/map-hero/scene';
import type { ForwarderTwinStateT } from '@/types/saas-forwarder';

export type ColdchainEventLevelT = 'info' | 'warning' | 'critical';

export type ColdchainEventT = {
  key: string;
  at: string;
  level: ColdchainEventLevelT;
  title: string;
};

export const EVENT_COLOR: Record<ColdchainEventLevelT, string> = {
  info: M2_COLORS.ok,
  warning: M2_COLORS.warn,
  critical: M2_COLORS.crit,
};

type ColdchainChartPropsT = {
  containerId: string;
  timeline: ForwarderTwinStateT['timeline'];
  bandMin: number;
  bandMax: number;
  events: ColdchainEventT[];
};

const HEIGHT = 200;
const ML = 32;
const MR = 12;
const MT = 10;
const MB = 20;
const HOUR_MS = 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * HOUR_MS;
const TICK_HOURS = [1, 2, 3, 6, 12, 24];
const Y_STEPS = [1, 2, 5, 10];

const formatTemp = (value: number) => value.toFixed(2);

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

export function ColdchainChart({
  containerId,
  timeline,
  bandMin,
  bandMax,
  events,
}: ColdchainChartPropsT) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const clipId = `cc-above-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const points = timeline
    .map(point => ({ ...point, ms: Date.parse(point.ts) }))
    .filter(({ ms }) => !Number.isNaN(ms))
    .sort((a, b) => a.ms - b.ms);
  const temps = points.map(({ temp_c }) => temp_c);
  const minTemp = temps.length > 0 ? Math.min(...temps) : bandMin;
  const maxTemp = temps.length > 0 ? Math.max(...temps) : bandMax;
  const yMin = Math.floor(Math.min(bandMin, minTemp) - 1);
  const yMax = Math.ceil(Math.max(bandMax + 2, maxTemp) + 1);
  const yStep = Y_STEPS.find(step => (yMax - yMin) / step <= 6) ?? 20;
  const t0 = points[0]?.ms ?? 0;
  const t1 = Math.max(points.at(-1)?.ms ?? 1, t0 + 1);
  const w = Math.max(width - ML - MR, 1);
  const h = HEIGHT - MT - MB;
  const x = (ms: number) => ML + ((ms - t0) / (t1 - t0)) * w;
  const y = (value: number) => MT + ((yMax - value) / (yMax - yMin)) * h;

  const outages: { start: number; end: number }[] = [];
  points.forEach((point, index) => {
    if (point.power_on) return;
    const end = points[index + 1]?.ms ?? point.ms;
    const last = outages.at(-1);
    if (last && points[index - 1]?.power_on === false) last.end = end;
    else outages.push({ start: point.ms, end });
  });

  const yTicks: number[] = [];
  for (let value = Math.ceil(yMin / yStep) * yStep; value <= yMax; value += yStep) {
    yTicks.push(value);
  }
  const tickHours =
    TICK_HOURS.find(step => (step * HOUR_MS * w) / (t1 - t0) >= 64) ?? TICK_HOURS.at(-1) ?? 24;
  const xTicks: number[] = [];
  const firstTick =
    Math.ceil((t0 + KST_OFFSET_MS) / (tickHours * HOUR_MS)) * tickHours * HOUR_MS - KST_OFFSET_MS;
  for (let ms = firstTick; ms <= t1; ms += tickHours * HOUR_MS) xTicks.push(ms);
  const multiDay = t1 - t0 > 24 * HOUR_MS;

  const linePath = points
    .map(
      ({ ms, temp_c }, index) => `${index ? 'L' : 'M'}${x(ms).toFixed(1)} ${y(temp_c).toFixed(1)}`
    )
    .join('');
  const maxIndex = temps.indexOf(maxTemp);
  const maxPoint = maxIndex >= 0 ? points[maxIndex] : null;
  const hover = hoverIndex !== null ? (points[hoverIndex] ?? null) : null;
  const inRange = events
    .map((event, index) => ({ ...event, ms: Date.parse(event.at), order: index + 1 }))
    .filter(({ ms }) => !Number.isNaN(ms) && ms >= t0 && ms <= t1);

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const target = t0 + ((event.clientX - rect.left - ML) / w) * (t1 - t0);
    let best = 0;
    points.forEach(({ ms }, index) => {
      if (Math.abs(ms - target) < Math.abs(points[best].ms - target)) best = index;
    });
    setHoverIndex(best);
  };

  const label = maxPoint
    ? `${containerId} 품온 ${hourMinute(points[0].ts)}~${hourMinute(points.at(-1)?.ts)}, 최고 ${formatTemp(maxPoint.temp_c)}도`
    : `${containerId} 품온`;

  return (
    <div
      ref={ref}
      className="relative h-[200px] min-w-0"
      onMouseMove={onMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      {width > 0 && points.length > 0 ? (
        <svg width={width} height={HEIGHT} role="img" aria-label={label} className="block">
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={width} height={Math.max(y(bandMax), 0)} />
            </clipPath>
          </defs>
          {outages.map(({ start, end }) => {
            const x0 = x(start);
            const x1 = Math.max(x(end), x0 + 1);
            const minutes = Math.round((end - start) / 60000);
            return (
              <g key={start}>
                <rect x={x0} y={MT} width={x1 - x0} height={h} fill="#f2f3f5" />
                {x1 - x0 > 76 ? (
                  <text
                    x={(x0 + x1) / 2}
                    y={MT + 12}
                    fontSize={10.5}
                    textAnchor="middle"
                    fill={M2_COLORS.muted}
                  >
                    전원 꺼짐 {minutes}분
                  </text>
                ) : null}
              </g>
            );
          })}
          <rect
            x={ML}
            y={y(bandMax)}
            width={w}
            height={Math.max(y(bandMin) - y(bandMax), 0)}
            fill="rgba(15,138,102,.10)"
          />
          <text
            x={ML + w - 4}
            y={y(bandMin) - 4}
            fontSize={10.5}
            textAnchor="end"
            fill="#0b6b4f"
            fontWeight={600}
          >
            적정 {bandMin}~{bandMax}°C
          </text>
          {yTicks.map(value => (
            <g key={value}>
              <line x1={ML} x2={ML + w} y1={y(value)} y2={y(value)} stroke="rgba(15,27,51,.06)" />
              <text x={ML - 6} y={y(value) + 3.5} fontSize={10} textAnchor="end" fill="#7d8696">
                {value}°
              </text>
            </g>
          ))}
          {xTicks.map(ms => (
            <text
              key={ms}
              x={x(ms)}
              y={HEIGHT - 4}
              fontSize={10}
              textAnchor="middle"
              fill="#7d8696"
            >
              {multiDay && new Date(ms + KST_OFFSET_MS).getUTCHours() === 0
                ? monthDay(new Date(ms).toISOString())
                : hourMinute(new Date(ms).toISOString())}
            </text>
          ))}
          <path
            d={`${linePath}L${x(t1)} ${y(bandMax)}L${x(t0)} ${y(bandMax)}Z`}
            fill="rgba(217,58,64,.10)"
            clipPath={`url(#${clipId})`}
          />
          <path
            d={linePath}
            fill="none"
            stroke={M2_COLORS.ink}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
          {inRange.map(event => {
            const ex = x(event.ms);
            return (
              <g key={event.key}>
                <title>{`${event.order}. ${hourMinute(event.at)} ${event.title}`}</title>
                <line
                  x1={ex}
                  x2={ex}
                  y1={MT}
                  y2={MT + h}
                  stroke={EVENT_COLOR[event.level]}
                  strokeDasharray="2 3"
                  opacity={0.55}
                />
                <rect
                  x={ex - 7}
                  y={MT}
                  width={14}
                  height={14}
                  rx={4}
                  fill={EVENT_COLOR[event.level]}
                />
                <text
                  x={ex}
                  y={MT + 10.5}
                  fontSize={10}
                  fontWeight={700}
                  textAnchor="middle"
                  fill="#fff"
                >
                  {event.order}
                </text>
              </g>
            );
          })}
          {maxPoint && maxPoint.temp_c > bandMax ? (
            <g>
              <circle cx={x(maxPoint.ms)} cy={y(maxPoint.temp_c)} r={3.5} fill={M2_COLORS.crit} />
              <text
                x={x(maxPoint.ms) + 6}
                y={y(maxPoint.temp_c) + 2}
                fontSize={11}
                fontWeight={700}
                fill={M2_COLORS.crit}
              >
                {formatTemp(maxPoint.temp_c)}°
              </text>
            </g>
          ) : null}
          {hover ? (
            <g>
              <line
                x1={x(hover.ms)}
                x2={x(hover.ms)}
                y1={MT}
                y2={MT + h}
                stroke={M2_COLORS.brand}
                opacity={0.6}
              />
              <circle
                cx={x(hover.ms)}
                cy={y(hover.temp_c)}
                r={4}
                fill={M2_COLORS.brand}
                stroke="#fff"
                strokeWidth={2}
              />
            </g>
          ) : null}
        </svg>
      ) : null}
      {hover ? (
        <div
          aria-hidden
          className="m2-num pointer-events-none absolute top-1 rounded-[7px] bg-white px-2 py-[3px] text-[11.5px] whitespace-nowrap shadow-[0_0_0_.5px_var(--m2-line-2)]"
          style={{ left: Math.min(width - 170, Math.max(0, x(hover.ms) + 8)) }}
        >
          {hourMinute(hover.ts)} · {formatTemp(hover.temp_c)}°C
          {hover.temp_c > bandMax ? ' · 적정 초과' : ''}
          {hover.power_on ? '' : ' · 전원 꺼짐'}
        </div>
      ) : null}
    </div>
  );
}
