import { formatManwon } from '@/utils/format';

export const wonAbs = (krw: number) => `${Math.round(Math.abs(krw)).toLocaleString('ko-KR')}원`;

export type MoneyToneT = 'ok' | 'berry' | 'flat';

export const costDeltaWords = (krw: number): { text: string; tone: MoneyToneT } => {
  if (krw < 0) return { text: `절감 ${wonAbs(krw)}`, tone: 'ok' };
  if (krw > 0) return { text: `추가 비용 ${wonAbs(krw)}`, tone: 'berry' };

  return { text: '비용 변화 없음', tone: 'flat' };
};

export const burdenWords = (krw: number): { text: string; tone: MoneyToneT } => {
  if (krw > 0) return { text: `+${wonAbs(krw)} 더 냄`, tone: 'berry' };
  if (krw < 0) return { text: `${wonAbs(krw)} 덜 냄`, tone: 'ok' };

  return { text: '변화 없음', tone: 'flat' };
};

export const settlementWords = (adjustment: number): { text: string; tone: MoneyToneT } | null => {
  if (adjustment > 0) return { text: `내는 부담금 ${wonAbs(adjustment)}`, tone: 'berry' };
  if (adjustment < 0) return { text: `받는 보전금 ${wonAbs(adjustment)}`, tone: 'ok' };

  return null;
};

export const manwonShort = (krw: number) => `${formatManwon(krw)}만`;

export const signedPercent = (pct: number) => {
  const text = `${Math.abs(pct).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`;
  if (pct > 0) return `+${text}`;

  return pct < 0 ? `−${text}` : text;
};

export const TONE_CLASS: Record<MoneyToneT, string> = {
  ok: 'text-m2-ok-ink',
  berry: 'text-m2-berry-ink',
  flat: 'text-m2-muted',
};
