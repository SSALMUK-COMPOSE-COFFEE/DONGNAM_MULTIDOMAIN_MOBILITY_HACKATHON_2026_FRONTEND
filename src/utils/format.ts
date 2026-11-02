const EMPTY = '–';

/** 원 → 만 원 (소수 첫째 자리까지) */
export const formatManwon = (krw: number | null | undefined) =>
  typeof krw === 'number'
    ? (krw / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
    : EMPTY;

/** 0.066 → '6.6%' */
export const formatPercent = (ratio: number | null | undefined, digits = 1) =>
  typeof ratio === 'number' ? `${(ratio * 100).toFixed(digits)}%` : EMPTY;

/** 1960389 → '+196만', -1960389 → '−196만' (변화량 표시) */
export const formatSignedManwon = (krw: number | null | undefined) => {
  if (typeof krw !== 'number') return EMPTY;
  if (krw === 0) return '0';

  return `${krw > 0 ? '+' : '−'}${formatManwon(Math.abs(krw))}`;
};
