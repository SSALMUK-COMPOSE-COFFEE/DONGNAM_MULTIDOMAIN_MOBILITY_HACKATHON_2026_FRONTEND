import type { PlatformMetricT } from '@/types/saas-platform';

export const EMPTY_VALUE = '–';

export const FILL_TARGET = 0.85;

const finite = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const percentText = (ratio: number | null | undefined, digits = 1) =>
  finite(ratio) ? `${(ratio * 100).toFixed(digits)}%` : EMPTY_VALUE;

export const countText = (value: number | null | undefined, digits = 0) =>
  finite(value)
    ? value.toLocaleString('ko-KR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
      })
    : EMPTY_VALUE;

export const metricRatioText = (metric: PlatformMetricT, unit: string) => {
  if (!finite(metric.numerator) || !finite(metric.denominator)) return null;

  return `${countText(metric.numerator, 1)}/${countText(metric.denominator, 1)}${unit}`;
};

export const isAssumed = (source: string | null | undefined) =>
  typeof source === 'string' && source.trim().startsWith('가정');

export const signedWon = (krw: number) =>
  krw < 0
    ? `−${Math.abs(Math.round(krw)).toLocaleString('ko-KR')}원`
    : `${Math.round(krw).toLocaleString('ko-KR')}원`;

export const shareText = (ratio: number) => `${Math.round(ratio * 100)}%`;
