import {
  M2_COLORS,
  type MapSceneT,
  type PlanSceneSourceT,
  shortPlaceName,
  toKstIso,
} from '@/components/map-hero/scene';

export type TimelineMarkT = {
  key: string;
  at: string;
  label: string;
  color: string;
  textColor?: string;
  keys: string[];
  title?: string;
  shortLabels?: string[];
};

export type TimelineBarT = {
  key: string;
  start: string;
  end: string;
  label: string;
  color: string;
  keys: string[];
  title?: string;
};

export type TimelineRowT =
  | { key: string; label: string; kind: 'marks'; items: TimelineMarkT[] }
  | { key: string; label: string; kind: 'bars'; items: TimelineBarT[] };

export type TimelineBandT = { key: string; start: string; end: string; label: string };

export type TimelineCutToneT = 'crit' | 'brand' | 'ink';

export type TimelineCutT = {
  key: string;
  at: string;
  label: string;
  tone: TimelineCutToneT;
  side: 'left' | 'right';
  keys: string[];
};

export type TimelineDataT = {
  span: [string, string];
  rows: TimelineRowT[];
  bands: TimelineBandT[];
  cuts: TimelineCutT[];
};

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
const KST_OFFSET_MS = 9 * HOUR_MS;
export const GUTTER = 92;
const PAD_RIGHT = 20;
export const LINE_TOP = 26;
export const AXIS_TOP = 24;
export const CUT_LINE_H = 13;
export const BASE_ROW_START = 48;
export const MARK_ROW_H = 22;
export const BAR_LANE_H = 20;
export const BOTTOM_PAD = 18;
const DAY_LABEL_W = 62;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const CUT_COLOR: Record<TimelineCutToneT, { line: string; text: string }> = {
  crit: { line: M2_COLORS.crit, text: M2_COLORS.crit },
  brand: { line: M2_COLORS.brand, text: M2_COLORS.brandInk },
  ink: { line: M2_COLORS.ink, text: M2_COLORS.ink },
};

const toMs = (value: string | number) => (typeof value === 'number' ? value : Date.parse(value));

const kstDate = (ms: number) => new Date(ms + KST_OFFSET_MS);

export const kstDayStart = (ms: number) =>
  Math.floor((ms + KST_OFFSET_MS) / DAY_MS) * DAY_MS - KST_OFFSET_MS;

export const kstHourMinute = (value: string | number) => {
  const ms = toMs(value);
  if (Number.isNaN(ms)) return '';
  const date = kstDate(ms);

  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
};

export const kstDayLabel = (value: string | number) => {
  const ms = toMs(value);
  if (Number.isNaN(ms)) return '';
  const date = kstDate(ms);

  return `${date.getUTCMonth() + 1}/${date.getUTCDate()} (${WEEKDAYS[date.getUTCDay()]})`;
};

export const estimateTextWidth = (text: string, fontSize = 11) =>
  [...text].reduce((sum, char) => {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x1100) return sum + fontSize * 0.95;
    if (char === ' ') return sum + fontSize * 0.3;
    if (/[A-Z0-9]/.test(char)) return sum + fontSize * 0.64;

    return sum + fontSize * 0.55;
  }, 0);

const overlaps = (a: [number, number], b: [number, number], gap = 4) =>
  a[0] < b[1] + gap && b[0] < a[1] + gap;

type PlacedMarkT = TimelineMarkT & {
  x: number;
  top: number;
  tag: 'right' | 'left' | null;
  tagW: number;
  tagText: string;
};
type PlacedBarT = TimelineBarT & {
  x0: number;
  x1: number;
  top: number;
  inner: boolean;
  outside: boolean;
  tagW: number;
};
type PlacedRowT = { key: string; label: string; top: number };
type PlacedCutT = TimelineCutT & { x: number; line: number; labelW: number };
type PlacedBandT = TimelineBandT & { x0: number; x1: number };

export type TimelineLayoutT = {
  height: number;
  rowStart: number;
  rows: PlacedRowT[];
  marks: PlacedMarkT[];
  bars: PlacedBarT[];
  bands: PlacedBandT[];
  bandTop: number;
  bandHeight: number;
  cuts: PlacedCutT[];
  days: { key: number; x: number; label: string | null }[];
  hours: { key: number; x: number; label: string }[];
  now: { x: number; label: string } | null;
};

export function layoutTimeline(
  data: TimelineDataT,
  width: number,
  nowValue: string | number | null
): TimelineLayoutT | null {
  const start = toMs(data.span[0]);
  const end = toMs(data.span[1]);
  const inner = width - GUTTER - PAD_RIGHT;
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start || inner <= 40) return null;

  const pxPerMs = inner / (end - start);
  const x = (ms: number) => GUTTER + (ms - start) * pxPerMs;
  const inSpan = (ms: number) => !Number.isNaN(ms) && ms >= start && ms <= end;
  const pxPerDay = DAY_MS * pxPerMs;
  const dayStep = Math.max(1, Math.ceil((DAY_LABEL_W + 8) / pxPerDay));

  const days: TimelineLayoutT['days'] = [];
  for (let ms = kstDayStart(start), index = 0; ms <= end; ms += DAY_MS, index += 1) {
    if (ms < start) continue;
    const label = kstDayLabel(ms);
    const fits = x(ms) + 4 + estimateTextWidth(label, 11) <= width - 2;
    days.push({ key: ms, x: x(ms), label: index % dayStep === 0 && fits ? label : null });
  }

  const hourStep = [6, 12].find(step => step * HOUR_MS * pxPerMs >= 22) ?? null;
  const hours: TimelineLayoutT['hours'] = [];
  if (hourStep) {
    for (let ms = kstDayStart(start); ms <= end; ms += hourStep * HOUR_MS) {
      const hour = kstDate(ms).getUTCHours();
      if (hour === 0 || ms < start) continue;
      hours.push({ key: ms, x: x(ms), label: String(hour).padStart(2, '0') });
    }
  }

  const nowMs = nowValue === null ? Number.NaN : toMs(nowValue);
  const nowCut: TimelineCutT[] = inSpan(nowMs)
    ? [
        {
          key: '__now',
          at: toKstIso(nowMs),
          label: `지금 ${kstHourMinute(nowMs)}`,
          tone: 'ink',
          side: 'right',
          keys: [],
        },
      ]
    : [];

  const dayBoxes = days
    .filter(({ label }) => label)
    .map(
      ({ x: dx, label }) =>
        [dx + 4, dx + 4 + estimateTextWidth(label ?? '', 11)] as [number, number]
    );
  const cutBoxes: { line: number; box: [number, number] }[] = [];
  const cuts: PlacedCutT[] = [...data.cuts, ...nowCut]
    .map(cut => ({ cut, ms: toMs(cut.at) }))
    .filter(({ ms }) => inSpan(ms))
    .sort((a, b) => a.ms - b.ms)
    .map(({ cut, ms }) => {
      const cx = x(ms);
      const labelW = estimateTextWidth(cut.label, 11);
      const rightSide = cut.side === 'right' && cx + 5 + labelW <= width - 4;
      const leftSide = !rightSide && cx - 5 - labelW >= 4;
      const box: [number, number] =
        leftSide || cut.side === 'left' ? [cx - 5 - labelW, cx - 5] : [cx + 5, cx + 5 + labelW];
      const blocked = (line: number) =>
        (line === 0 && dayBoxes.some(day => overlaps(day, box))) ||
        cutBoxes.some(other => other.line === line && overlaps(other.box, box));
      const line = [0, 1, 2].find(candidate => !blocked(candidate)) ?? 2;
      cutBoxes.push({ line, box });

      return {
        ...cut,
        side: box[0] < cx ? ('left' as const) : ('right' as const),
        x: cx,
        line,
        labelW,
      };
    });

  const extraLines = cuts.reduce((max, cut) => Math.max(max, cut.line), 0);
  const rowStart = BASE_ROW_START + extraLines * CUT_LINE_H;

  let cursor = rowStart;
  let bandTop = Number.NaN;
  let bandBottom = Number.NaN;
  const rows: PlacedRowT[] = [];
  const marks: PlacedMarkT[] = [];
  const bars: PlacedBarT[] = [];

  data.rows.forEach(row => {
    if (row.kind === 'marks') {
      const sorted = row.items
        .map(item => ({ item, ms: toMs(item.at) }))
        .filter(({ ms }) => inSpan(ms))
        .sort((a, b) => a.ms - b.ms);
      let prevEnd = GUTTER;
      sorted.forEach(({ item, ms }, index) => {
        const mx = x(ms);
        const nextX = index + 1 < sorted.length ? x(sorted[index + 1].ms) - 6 : width - 4;
        const placement = [item.label, ...(item.shortLabels ?? [])]
          .filter(Boolean)
          .map(text => ({ text, tagW: estimateTextWidth(text, 11) + 4 }))
          .map(({ text, tagW }) => {
            if (mx + 9 + tagW <= nextX) return { text, tagW, tag: 'right' as const };
            if (mx - 9 - tagW >= prevEnd + 4) return { text, tagW, tag: 'left' as const };
            return null;
          })
          .find(candidate => candidate !== null);
        const tag = placement ? placement.tag : null;
        const tagW = placement ? placement.tagW : 0;
        prevEnd = tag === 'right' ? mx + 9 + tagW : mx + 5;
        marks.push({
          ...item,
          x: mx,
          top: cursor,
          tag,
          tagW,
          tagText: placement ? placement.text : '',
        });
      });
      rows.push({ key: row.key, label: row.label, top: cursor - 6 });
      cursor += MARK_ROW_H;
      return;
    }

    const sorted = row.items
      .map(item => ({ item, s: toMs(item.start), e: toMs(item.end) }))
      .filter(({ s, e }) => !Number.isNaN(s) && !Number.isNaN(e) && e > start && s < end)
      .sort((a, b) => a.s - b.s);
    const laneEnds: number[] = [];
    const placed = sorted.map(({ item, s, e }) => {
      const x0 = x(Math.max(s, start));
      const x1 = Math.max(x(Math.min(e, end)), x0 + 4);
      let lane = laneEnds.findIndex(laneEnd => laneEnd + 3 <= x0);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(x1);
      } else {
        laneEnds[lane] = x1;
      }
      const tagW = estimateTextWidth(item.label, 10.5) + 2;
      return { item, x0, x1, lane, tagW, inner: tagW + 10 <= x1 - x0 };
    });
    const lanes = Math.max(1, laneEnds.length);

    placed.forEach((bar, index) => {
      const next = placed.slice(index + 1).find(other => other.lane === bar.lane);
      const tagEnd = bar.x1 + 5 + bar.tagW;
      const outside = !bar.inner && tagEnd <= width - 4 && (!next || next.x0 >= tagEnd + 4);
      bars.push({
        ...bar.item,
        x0: bar.x0,
        x1: bar.x1,
        top: cursor + bar.lane * BAR_LANE_H,
        inner: bar.inner,
        outside,
        tagW: bar.tagW,
      });
    });

    rows.push({ key: row.key, label: row.label, top: cursor + 1 });
    if (Number.isNaN(bandTop)) bandTop = cursor - 3;
    bandBottom = cursor + lanes * BAR_LANE_H;
    cursor += lanes * BAR_LANE_H + 2;
  });

  if (Number.isNaN(bandTop)) {
    bandTop = rowStart - 3;
    bandBottom = cursor;
  }

  const bands: PlacedBandT[] = data.bands.flatMap(band => {
    const s = Math.max(toMs(band.start), start);
    const e = Math.min(toMs(band.end), end);
    if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return [];
    return [{ ...band, x0: x(s), x1: x(e) }];
  });

  return {
    height: cursor + BOTTOM_PAD,
    rowStart,
    rows,
    marks,
    bars,
    bands,
    bandTop,
    bandHeight: bandBottom - bandTop,
    cuts,
    days,
    hours,
    now: nowCut.length > 0 ? { x: x(nowMs), label: nowCut[0].label } : null,
  };
}

const parseClock = (clock: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(clock);
  if (!match) return null;

  return (Number(match[1]) * 60 + Number(match[2])) * 60 * 1000;
};

const READY_TIME = 'T08:00:00+09:00';
const OTHER_LABEL = '다른 화주';

export function timelineFromScene(
  session: PlanSceneSourceT | null,
  scene: MapSceneT
): TimelineDataT | null {
  const placeByKey = new Map(scene.places.map(place => [place.key, place]));
  const lotReady = new Map(
    (session?.scenario.lots ?? []).map(lot => [lot.id, lot.ready_date ?? null])
  );

  const readyGroups = new Map<
    string,
    { at: string; tone: string; color: string; parts: Map<string, number>; keys: Set<string> }
  >();
  scene.runs.forEach(run =>
    run.stops.forEach(stop => {
      const groupKey = `${stop.readyAt}|${run.tone}`;
      const group = readyGroups.get(groupKey) ?? {
        at: stop.readyAt,
        tone: run.tone,
        color: run.color,
        parts: new Map<string, number>(),
        keys: new Set<string>(),
      };
      const place = placeByKey.get(stop.packhouseId);
      const name = place && !place.anonymous ? place.shortName : OTHER_LABEL;
      if (place && !place.anonymous) group.keys.add(stop.packhouseId);
      group.keys.add(run.key);
      group.parts.set(name, (group.parts.get(name) ?? 0) + stop.pallets);
      readyGroups.set(groupKey, group);
    })
  );

  const readyMarks: TimelineMarkT[] = [...readyGroups.entries()].map(([groupKey, group]) => {
    const parts = [...group.parts.entries()];
    const label = parts.map(([name, pallets]) => `${name} ${pallets}`).join(' · ');
    const total = parts.reduce((sum, [, pallets]) => sum + pallets, 0);
    const shortLabels = [
      ...(parts.length > 1 ? [`${parts[0][0]} 외 ${parts.length - 1} · ${total}`] : []),
      ...(parts.length > 1 ? [`${parts[0][0]} 외 ${parts.length - 1}`] : []),
      `${total}P`,
    ];
    return {
      key: `ready:${groupKey}`,
      at: group.at,
      label,
      color: group.color,
      keys: [...group.keys],
      title: `${kstDayLabel(group.at)} ${kstHourMinute(group.at)} 출하 준비 · ${label}`,
      shortLabels,
    };
  });

  const airMarks: TimelineMarkT[] = scene.air.flatMap(item => {
    const readyDate = item.readyDate ?? lotReady.get(item.lotId) ?? null;
    if (!readyDate) return [];
    const at = `${readyDate.slice(0, 10)}${READY_TIME}`;
    const place = item.packhouseId ? placeByKey.get(item.packhouseId) : null;
    const fallbackName = item.anonymous ? OTHER_LABEL : shortPlaceName(item.name);
    const name = place && !place.anonymous ? place.shortName : fallbackName;
    const label = `${name} ${item.pallets} → 항공`;
    return [
      {
        key: item.key,
        at,
        label,
        color: M2_COLORS.warn,
        textColor: M2_COLORS.warnInk,
        shortLabels: [`항공 ${item.pallets}`, `${item.pallets}P`],
        keys: [item.key, item.lotId, 'air', ...(item.packhouseId ? [item.packhouseId] : [])],
        title: `${kstDayLabel(at)} 출하 준비 · ${label}`,
      },
    ];
  });

  const bars: TimelineBarT[] = scene.runs.map(run => ({
    key: `${run.voyageId}|${run.key}`,
    start: run.departAt,
    end: run.portEta,
    label: run.label,
    color: run.color,
    keys: [run.key, ...run.stopKeys.filter(key => placeByKey.has(key)), ...run.containerIds],
    title: `${run.label} · 출발 ${kstHourMinute(run.departAt)} → 도착 ${kstHourMinute(run.portEta)} · ${run.loadPallets}/${run.capacity}P`,
  }));

  const times = [
    ...readyMarks.map(({ at }) => Date.parse(at)),
    ...airMarks.map(({ at }) => Date.parse(at)),
    ...bars.flatMap(({ start, end }) => [Date.parse(start), Date.parse(end)]),
  ].filter(ms => !Number.isNaN(ms));
  const lane = scene.seaLane;
  const etdMs = lane ? Date.parse(lane.etd) : Number.NaN;
  const cyMs = lane ? Date.parse(lane.cyCutoff) : Number.NaN;
  const endCandidates = [...times, etdMs, cyMs].filter(ms => !Number.isNaN(ms));
  const startCandidates =
    times.length > 0 ? times : [cyMs - DAY_MS].filter(ms => !Number.isNaN(ms));
  if (startCandidates.length === 0 || endCandidates.length === 0) return null;

  const spanStart = kstDayStart(Math.min(...startCandidates));
  const rawEnd = Math.max(...endCandidates) + 6 * HOUR_MS;
  const endDay = kstDayStart(rawEnd);
  const spanEnd = endDay === rawEnd ? rawEnd : endDay + DAY_MS;
  if (spanEnd <= spanStart) return null;

  const bands: TimelineBandT[] = [];
  for (let day = spanStart; day < spanEnd; day += DAY_MS) {
    scene.gateWindows.forEach((window, index) => {
      const startHour = parseClock(window.start);
      const endHour = parseClock(window.end);
      if (startHour === null || endHour === null) return;
      const s = day + startHour;
      const e = endHour > startHour ? day + endHour : day + DAY_MS + endHour;
      bands.push({
        key: `gate:${day}:${index}`,
        start: toKstIso(s),
        end: toKstIso(e),
        label: window.label,
      });
    });
  }

  const cuts: TimelineCutT[] = lane
    ? [
        {
          key: `cy:${lane.key}`,
          at: lane.cyCutoff,
          label: `CY 마감 ${kstHourMinute(lane.cyCutoff)}`,
          tone: 'crit',
          side: 'left',
          keys: scene.port ? [scene.port.key, ...scene.containers.map(({ key }) => key)] : [],
        },
        {
          key: `etd:${lane.key}`,
          at: lane.etd,
          label: `ETD ${kstHourMinute(lane.etd)}`,
          tone: 'brand',
          side: 'right',
          keys: [lane.key],
        },
      ]
    : [];

  const rows: TimelineRowT[] = [];
  if (readyMarks.length + airMarks.length > 0) {
    rows.push({
      key: 'ready',
      label: '출하 준비',
      kind: 'marks',
      items: [...readyMarks, ...airMarks],
    });
  }
  if (bars.length > 0) rows.push({ key: 'runs', label: '집하 트럭', kind: 'bars', items: bars });

  return { span: [toKstIso(spanStart), toKstIso(spanEnd)], rows, bands, cuts };
}
