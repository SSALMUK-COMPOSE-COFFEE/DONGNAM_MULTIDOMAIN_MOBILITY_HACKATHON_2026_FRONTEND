import { cn } from 'cn';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

export type HeroPanelRowT = { k: ReactNode; v: ReactNode };

export type HeroPanelPropsT = {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  rows?: HeroPanelRowT[];
  children?: ReactNode;
  className?: string;
};

export function HeroPanel({ label, value, sub, rows = [], children, className }: HeroPanelPropsT) {
  return (
    <div className={cn('m2-hpanel', className)}>
      <div className="m2-lbl">{label}</div>
      <div className="m2-big">{value}</div>
      {sub ? <div className="m2-sub">{sub}</div> : null}
      {rows.map((row, index) => (
        <div key={index} className="m2-hrow">
          <span>{row.k}</span>
          <b className="m2-num">{row.v}</b>
        </div>
      ))}
      {children}
    </div>
  );
}

export type MapLegendItemT = {
  label: ReactNode;
  color?: string | null;
  dash?: boolean;
};

export type MapLegendPropsT = {
  items: MapLegendItemT[];
  note?: ReactNode;
  className?: string;
};

export function MapLegend({ items, note, className }: MapLegendPropsT) {
  if (items.length === 0 && !note) return null;

  return (
    <div className={cn('m2-hpanel m2-legend', className)}>
      {items.map((item, index) => (
        <span key={index} className={item.color ? '' : 'is-note'}>
          {item.color ? (
            <i aria-hidden className={item.dash ? 'is-dash' : ''} style={{ color: item.color }} />
          ) : null}
          {item.label}
        </span>
      ))}
      {note ? <span className="is-note">{note}</span> : null}
    </div>
  );
}

export type StepStateT = 'done' | 'cur' | 'todo';

export type StepItemT = {
  title: ReactNode;
  sub?: ReactNode;
  state: StepStateT;
};

export function Steps({ items, className }: { items: StepItemT[]; className?: string }) {
  return (
    <ol className={cn('m2-steps', className)}>
      {items.map((item, index) => (
        <li
          key={index}
          className={cn(
            'm2-step',
            item.state === 'done' && 'is-done',
            item.state === 'cur' && 'is-cur'
          )}
          aria-current={item.state === 'cur' ? 'step' : false}
        >
          <span className="m2-step-n" aria-hidden>
            {item.state === 'done' ? <Check size={14} strokeWidth={3} /> : index + 1}
          </span>
          <div>
            <b>{item.title}</b>
            {item.sub ? <span>{item.sub}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export type SlotSegmentT = {
  key: string;
  pallets: number;
  color: string;
  label: ReactNode;
};

export type SlotBarPropsT = {
  capacity: number;
  segments: SlotSegmentT[];
  legend?: boolean;
  emptyLabel?: ReactNode;
  className?: string;
};

export function SlotBar({
  capacity,
  segments,
  legend = true,
  emptyLabel = '빈칸',
  className,
}: SlotBarPropsT) {
  const total = Math.max(0, Math.floor(capacity));
  const cells = segments.flatMap(segment =>
    Array.from({ length: Math.max(0, Math.floor(segment.pallets)) }, () => segment.color)
  );
  const filled = Math.min(cells.length, total);
  const empty = total - filled;

  return (
    <div className={className}>
      <div
        className="m2-slots"
        role="img"
        aria-label={`${total}칸 중 ${filled}칸 적재`}
        style={{ ['--m2-slot-n' as string]: Math.max(total, 1) }}
      >
        {Array.from({ length: total }, (_, index) => (
          <i key={index} style={index < filled ? { background: cells[index] } : {}} />
        ))}
      </div>
      {legend ? (
        <div className="m2-kv">
          {segments
            .filter(({ pallets }) => pallets > 0)
            .map(segment => (
              <span key={segment.key}>
                <i className="m2-sq" style={{ background: segment.color }} />
                {segment.label} <span className="m2-num">{segment.pallets}</span>
              </span>
            ))}
          {empty > 0 ? (
            <span>
              {emptyLabel} <span className="m2-num">{empty}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type CompareToneT = 'base' | 'navy' | 'brand' | 'ok' | 'berry' | 'grape';

const COMPARE_COLOR: Record<CompareToneT, string> = {
  base: '#b9c1cd',
  navy: '#0d2a5e',
  brand: '#1a7bff',
  ok: '#0f8a66',
  berry: '#d93a40',
  grape: '#6047d1',
};

export type CompareRowT = {
  label: ReactNode;
  value: ReactNode;
  ratio: number;
  tone: CompareToneT;
};

export function CompareBars({ rows, className }: { rows: CompareRowT[]; className?: string }) {
  return (
    <div className={cn('m2-cmp', className)}>
      {rows.map((row, index) => {
        const ratio = Number.isFinite(row.ratio) ? Math.min(Math.max(row.ratio, 0), 1) : 0;
        return (
          <div key={index} className="contents">
            <span>{row.label}</span>
            <div className="m2-cmp-track">
              <div
                className="m2-cmp-bar"
                style={{ width: `${ratio * 100}%`, background: COMPARE_COLOR[row.tone] }}
              />
            </div>
            <b className="m2-cmp-v">{row.value}</b>
          </div>
        );
      })}
    </div>
  );
}
