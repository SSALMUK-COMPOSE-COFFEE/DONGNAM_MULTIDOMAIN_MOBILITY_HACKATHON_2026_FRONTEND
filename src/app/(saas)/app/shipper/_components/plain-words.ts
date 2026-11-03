import type { LotLabelMapT } from '@/app/(saas)/app/shipper/_components/lot-label';
import { withLotLabels } from '@/app/(saas)/app/shipper/_components/lot-label';

const PLAIN_WORDS: [RegExp, string][] = [
  [/CY\s*반입\s*마감/g, '항구 반입 마감'],
  [/CY\s*마감/g, '항구 반입 마감'],
  [/CY\s*반입/g, '항구 반입'],
  [/\bCY\b/g, '항구'],
  [/SI\s*정정/g, '선적 서류 정정'],
  [/SI\s*마감/g, '선적 서류 마감'],
  [/\bSI\b/g, '선적 서류'],
  [/VGM\s*재제출/g, '총중량 다시 신고'],
  [/VGM\s*마감/g, '총중량 신고 마감'],
  [/\bVGM\b/g, '총중량 신고'],
  [/신규\s*부킹/g, '새 배 예약'],
  [/부킹/g, '배 예약'],
  [/리퍼\s*플러그/g, '냉장 전원 연결'],
  [/리퍼/g, '냉장'],
  [/\bETD\b/g, '출항'],
  [/\bETA\b/g, '도착'],
];

export const plainWords = (text: string, labels?: LotLabelMapT) => {
  const plain = PLAIN_WORDS.reduce((value, [pattern, word]) => value.replace(pattern, word), text);

  return labels ? withLotLabels(plain, labels) : plain;
};
