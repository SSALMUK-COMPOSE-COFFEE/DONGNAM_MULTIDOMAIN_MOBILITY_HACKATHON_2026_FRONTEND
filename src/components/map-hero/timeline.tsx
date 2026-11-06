'use client';

import { cn } from 'cn';
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';

import {
  AXIS_TOP,
  BAR_LANE_H,
  BASE_ROW_START,
  BOTTOM_PAD,
  CUT_COLOR,
  CUT_LINE_H,
  LINE_TOP,
  MARK_ROW_H,
  type TimelineDataT,
  layoutTimeline,
} from '@/components/map-hero/timeline-data';
import { useMapLinkState } from '@/components/map-link';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export {
  estimateTextWidth,
  kstDayLabel,
  kstDayStart,
  kstHourMinute,
  timelineFromScene,
  type TimelineBandT,
  type TimelineBarT,
  type TimelineCutT,
  type TimelineCutToneT,
  type TimelineDataT,
  type TimelineMarkT,
  type TimelineRowT,
} from '@/components/map-hero/timeline-data';

export type TimelinePropsT = TimelineDataT & {
  title: string;
  now?: string | number | null;
  bandLegend?: string | null;
  markLegend?: string | null;
  className?: string;
};

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

type LinkHandlersT = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

function TimelineTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function Timeline({
  title,
  span,
  rows,
  bands,
  cuts,
  now = null,
  bandLegend = '부산신항 게이트 혼잡 (가정)',
  markLegend = '출하 준비',
  className,
}: TimelinePropsT) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const { activeKeys, isActive, hoverFromMap, focusFromMap } = useMapLinkState();
  const layout = width > 0 ? layoutTimeline({ span, rows, bands, cuts }, width, now) : null;
  const hasHl = activeKeys !== null;

  const linkProps = (keys: string[]): LinkHandlersT => ({
    onMouseEnter: () => hoverFromMap(keys),
    onMouseLeave: () => hoverFromMap(null),
    onFocus: () => hoverFromMap(keys),
    onBlur: () => hoverFromMap(null),
    onClick: () => focusFromMap(keys),
    onKeyDown: event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      focusFromMap(keys);
    },
  });
  const hlClass = (keys: string[]) => (hasHl && isActive(keys) ? 'is-hl' : '');
  const hasMarks = rows.some(row => row.kind === 'marks' && row.items.length > 0);

  return (
    <div
      ref={ref}
      className={cn('m2-tl', hasHl && 'has-hl', className)}
      style={{ height: layout?.height ?? BASE_ROW_START + MARK_ROW_H + BAR_LANE_H + BOTTOM_PAD }}
      role="group"
      aria-label={title}
    >
      <div className="m2-tl-ttl">{title}</div>
      <div className="m2-tl-key">
        {bands.length > 0 && bandLegend ? (
          <span>
            <i className="is-gate" />
            {bandLegend}
          </span>
        ) : null}
        {hasMarks && markLegend ? (
          <span>
            <i className="is-ready" />
            {markLegend}
          </span>
        ) : null}
      </div>

      {layout ? (
        <>
          {layout.days.map(day => (
            <div key={`d${day.key}`}>
              <div
                className="m2-tl-v is-day"
                style={{ left: day.x, top: LINE_TOP, bottom: 14 }}
                aria-hidden
              />
              {day.label ? (
                <div className="m2-tl-ax is-day" style={{ left: day.x, top: AXIS_TOP }}>
                  {day.label}
                </div>
              ) : null}
            </div>
          ))}
          {layout.hours.map(hour => (
            <div key={`h${hour.key}`} aria-hidden>
              <div
                className="m2-tl-v"
                style={{ left: hour.x, top: layout.rowStart - 6, bottom: 14 }}
              />
              <div className="m2-tl-ax is-hour" style={{ left: hour.x, bottom: 0 }}>
                {hour.label}
              </div>
            </div>
          ))}
          {layout.bands.map(band => (
            <div
              key={band.key}
              className="m2-tl-gate"
              title={band.label}
              style={{
                left: band.x0,
                width: band.x1 - band.x0,
                top: layout.bandTop,
                height: layout.bandHeight,
              }}
            />
          ))}
          {layout.rows.map(row => (
            <div key={row.key} className="m2-tl-lab" style={{ top: row.top }}>
              {row.label}
            </div>
          ))}

          {layout.marks.map(mark => {
            const keys = mark.keys;
            const k = keys.join(' ');
            const tip = mark.title ?? mark.label;
            return (
              <div key={mark.key}>
                <TimelineTip label={tip}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={tip}
                    data-k={k}
                    className={cn('m2-tl-m', hlClass(keys))}
                    style={{ left: mark.x, top: mark.top, background: mark.color }}
                    {...linkProps(keys)}
                  />
                </TimelineTip>
                {mark.tag ? (
                  <div
                    aria-hidden
                    data-k={k}
                    {...(mark.tagText === mark.label ? {} : { title: tip })}
                    className={cn('m2-tl-tag', hlClass(keys))}
                    style={{
                      left: mark.tag === 'right' ? mark.x + 9 : mark.x - 9 - mark.tagW,
                      top: mark.top - 2,
                      color: mark.textColor,
                    }}
                    {...linkProps(keys)}
                  >
                    {mark.tagText}
                  </div>
                ) : null}
              </div>
            );
          })}

          {layout.bars.map(bar => {
            const keys = bar.keys;
            const k = keys.join(' ');
            const tip = bar.title ?? bar.label;
            return (
              <div key={bar.key}>
                <TimelineTip label={tip}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={tip}
                    data-k={k}
                    className={cn('m2-tl-bar', hlClass(keys))}
                    style={{
                      left: bar.x0,
                      width: bar.x1 - bar.x0,
                      top: bar.top,
                      background: bar.color,
                    }}
                    {...linkProps(keys)}
                  >
                    {bar.inner ? bar.label : null}
                  </div>
                </TimelineTip>
                {bar.outside ? (
                  <div
                    aria-hidden
                    data-k={k}
                    className={cn('m2-tl-tag', hlClass(keys))}
                    style={{
                      left: bar.x1 + 5,
                      top: bar.top,
                      color: bar.color,
                      fontWeight: 650,
                    }}
                    {...linkProps(keys)}
                  >
                    {bar.label}
                  </div>
                ) : null}
              </div>
            );
          })}

          {layout.cuts.map(cut => {
            const color = CUT_COLOR[cut.tone];
            const isNow = cut.key === '__now';
            const keys = cut.keys;
            const interactive = keys.length > 0;
            return (
              <div key={cut.key}>
                <div
                  data-k={interactive ? keys.join(' ') : null}
                  className={cn('m2-tl-cut', isNow && 'is-now', interactive && hlClass(keys))}
                  style={{
                    left: cut.x - 1,
                    top: isNow ? layout.rowStart - 8 : LINE_TOP,
                    bottom: 14,
                    background: color.line,
                  }}
                  {...(interactive ? linkProps(keys) : {})}
                  tabIndex={-1}
                  aria-hidden
                />
                <div
                  data-k={interactive ? keys.join(' ') : null}
                  className={cn('m2-tl-tag', interactive && hlClass(keys))}
                  style={{
                    left: cut.side === 'left' ? cut.x - 5 - cut.labelW : cut.x + 5,
                    top: AXIS_TOP + cut.line * CUT_LINE_H,
                    color: color.text,
                    fontWeight: 700,
                    background: 'transparent',
                  }}
                  {...(interactive ? linkProps(keys) : {})}
                  tabIndex={-1}
                >
                  {cut.label}
                </div>
              </div>
            );
          })}
        </>
      ) : null}
    </div>
  );
}
