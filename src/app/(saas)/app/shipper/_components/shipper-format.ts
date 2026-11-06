import { burdenWords } from '@/components/replan-alternatives/money-words';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const EMPTY = '–';

const toMs = (value: string | number | null | undefined) => {
  if (value === null || typeof value === 'undefined' || value === '') return Number.NaN;
  if (typeof value === 'number') return value;

  return Date.parse(value.length <= 10 ? `${value}T00:00:00+09:00` : value);
};

const kstParts = (value: string | number | null | undefined) => {
  const ms = toMs(value);
  if (Number.isNaN(ms)) return null;
  const date = new Date(ms + KST_OFFSET_MS);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: WEEKDAYS[date.getUTCDay()],
    time: `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`,
  };
};

export const timeOf = (value: string | number | null | undefined) => toMs(value);

export const fmtDay = (value: string | number | null | undefined) => {
  const parts = kstParts(value);

  return parts ? `${parts.month}/${parts.day}(${parts.weekday})` : EMPTY;
};

export const fmtMonthDay = (value: string | number | null | undefined) => {
  const parts = kstParts(value);

  return parts ? `${parts.month}/${parts.day}` : EMPTY;
};

export const fmtDayTime = (value: string | number | null | undefined) => {
  const parts = kstParts(value);

  return parts ? `${parts.month}/${parts.day}(${parts.weekday}) ${parts.time}` : EMPTY;
};

export const fmtMonthDayTime = (value: string | number | null | undefined) => {
  const parts = kstParts(value);

  return parts ? `${parts.month}/${parts.day} ${parts.time}` : EMPTY;
};

export const fmtTime = (value: string | number | null | undefined) =>
  kstParts(value)?.time ?? EMPTY;

export const fmtLongDate = (value: string | number | null | undefined) => {
  const parts = kstParts(value);

  return parts ? `${parts.month}월 ${parts.day}일 ${parts.weekday}요일` : '';
};

export const fmtWon = (krw: number | null | undefined) =>
  typeof krw === 'number' && Number.isFinite(krw)
    ? `${Math.round(krw).toLocaleString('ko-KR')}원`
    : EMPTY;

export const fmtSignedWon = (krw: number | null | undefined) => {
  if (typeof krw !== 'number' || !Number.isFinite(krw)) return EMPTY;
  if (krw === 0) return '0원';

  return `${krw > 0 ? '+' : '−'}${Math.abs(Math.round(krw)).toLocaleString('ko-KR')}원`;
};

export const fmtBurden = (krw: number | null | undefined) =>
  typeof krw === 'number' && Number.isFinite(krw) ? burdenWords(krw).text : EMPTY;

export const fmtCount = (value: number) => value.toLocaleString('ko-KR');
