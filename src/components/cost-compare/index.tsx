import { cn } from 'cn';

import { formatManwon } from '@/utils/format';

export type CostCompareRowT = {
  label: string;
  /** 원 단위 */
  value: number;
  /** 고른 쪽(싼 쪽)은 파랑, 나머지는 회색 */
  isChosen: boolean;
};

type CostComparePropsT = {
  rows: CostCompareRowT[];
};

/** 발표 자료의 '해상 vs 항공' 가로 막대. 가장 큰 값을 꽉 찬 길이로 둔다 */
export function CostCompare({ rows }: CostComparePropsT) {
  const max = Math.max(...rows.map(({ value }) => value), 1);

  return (
    <div className="flex flex-col gap-4">
      {rows.map(({ label, value, isChosen }) => (
        <div key={label} className="grid grid-cols-[3.5rem_1fr] items-center gap-3">
          <span className="font-bold">{label}</span>
          <div className="flex items-center gap-3">
            <span
              className={cn('h-11 rounded-lg', isChosen ? 'bg-brand' : 'bg-slate')}
              style={{ width: `${(value / max) * 75}%` }}
            />
            <span
              className={cn('text-lg font-bold num', isChosen ? 'text-brand' : 'text-foreground')}
            >
              {formatManwon(value)}만 원
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
