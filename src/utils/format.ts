const EMPTY = '–';

/** 원 → 만 원 (소수 첫째 자리까지) */
export const formatManwon = (krw: number | null | undefined) =>
  typeof krw === 'number'
    ? (krw / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
    : EMPTY;

/** 0.066 → '6.6%' */
export const formatPercent = (ratio: number | null | undefined, digits = 1) =>
  typeof ratio === 'number' ? `${(ratio * 100).toFixed(digits)}%` : EMPTY;
