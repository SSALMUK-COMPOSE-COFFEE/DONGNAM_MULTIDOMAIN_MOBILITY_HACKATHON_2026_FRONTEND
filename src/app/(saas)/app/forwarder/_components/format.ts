import { kstDayLabel, kstHourMinute } from '@/components/map-hero/timeline-data';

const EMPTY = '–';
const MINUTE_MS = 60 * 1000;

export const hourMinute = (iso: string | null | undefined) => (iso && kstHourMinute(iso)) || EMPTY;

export const dayLabel = (iso: string | null | undefined) =>
  (iso && kstDayLabel(iso).replace(' ', '')) || EMPTY;

export const monthDay = (iso: string | null | undefined) => {
  const label = iso ? kstDayLabel(iso) : '';

  return label ? label.split(' ')[0] : EMPTY;
};

export const dayTime = (iso: string | null | undefined) =>
  iso && kstDayLabel(iso) ? `${dayLabel(iso)} ${hourMinute(iso)}` : EMPTY;

export const monthDayTime = (iso: string | null | undefined) =>
  iso && kstDayLabel(iso) ? `${monthDay(iso)} ${hourMinute(iso)}` : EMPTY;

export const circled = (sequence: number) =>
  sequence >= 1 && sequence <= 20 ? String.fromCodePoint(0x2460 + sequence - 1) : `${sequence}`;

export const formatKm = (km: number) =>
  `${km.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}km`;

export const formatMinutes = (minutes: number) => Math.round(minutes).toLocaleString('ko-KR');

export type RemainingT =
  { kind: 'unknown' } | { kind: 'passed' } | { kind: 'hours'; hours: number; minutes: number };

export const remainingUntil = (iso: string | null | undefined, now: number | null): RemainingT => {
  const target = iso ? Date.parse(iso) : Number.NaN;
  if (now === null || Number.isNaN(target)) return { kind: 'unknown' };
  const minutes = Math.floor((target - now) / MINUTE_MS);
  if (minutes <= 0) return { kind: 'passed' };
  return { kind: 'hours', hours: Math.floor(minutes / 60), minutes: minutes % 60 };
};
