import type { ScenarioT } from '@/types/api';

const EMPTY = '–';
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const KST_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const kstParts = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = KST_PARTS.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? '';

  return {
    year: part('year'),
    month: Number(part('month')),
    day: Number(part('day')),
    time: `${part('hour')}:${part('minute')}`,
    weekday: WEEKDAYS[WEEKDAY_INDEX[part('weekday')] ?? 0],
  };
};

export const won = (krw: number | null | undefined) =>
  typeof krw === 'number' && Number.isFinite(krw)
    ? `${Math.round(krw).toLocaleString('ko-KR')}원`
    : EMPTY;

export const wonNumber = (krw: number) => Math.round(krw).toLocaleString('ko-KR');

export const kstDayTime = (iso: string | null | undefined) => {
  const parts = kstParts(iso);

  return parts ? `${parts.month}/${parts.day}(${parts.weekday}) ${parts.time}` : EMPTY;
};

export const kstDateKey = (iso: string | null | undefined) => {
  const parts = kstParts(iso);
  if (!parts) return '';

  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

export const monthDay = (date: string | null | undefined) =>
  date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : EMPTY;

export const ratioPercent = (part: number, whole: number, digits = 1) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(digits)}%` : EMPTY;

export const so2Text = (text: string) => text.replace(/SO2/g, 'SO₂');

type ProductLikeT = { name: string; so2_treated: boolean };

export const productShortName = (product: ProductLikeT | null | undefined, fallback: string) => {
  if (!product) return fallback;
  const base = product.name.replace(/\s*\(.*\)\s*$/, '').trim() || product.name;

  return product.so2_treated ? `SO₂ ${base}` : base;
};

export const productOf = (scenario: Pick<ScenarioT, 'products'> | null | undefined, id: string) =>
  scenario?.products.find(product => product.id === id) ?? null;

export const isSo2Product = (
  scenario: Pick<ScenarioT, 'products'> | null | undefined,
  id: string
) => !!productOf(scenario, id)?.so2_treated;

export const portName = (scenario: Pick<ScenarioT, 'ports'> | null | undefined, id: string) =>
  scenario?.ports.find(port => port.id === id)?.name ?? id;

export const feeRateOf = (scenario: Pick<ScenarioT, 'cost_params'> | null | undefined) => {
  const value = scenario?.cost_params?.platform_fee_rate.value;

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

export const percentLabel = (ratio: number | null) =>
  ratio === null ? '' : `${Math.round(ratio * 100)}%`;

export const errorDetailOf = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) return null;
  const response = (error as { response?: { data?: { detail?: unknown } } }).response;
  const detail = response?.data?.detail;

  return typeof detail === 'string' ? detail : null;
};
