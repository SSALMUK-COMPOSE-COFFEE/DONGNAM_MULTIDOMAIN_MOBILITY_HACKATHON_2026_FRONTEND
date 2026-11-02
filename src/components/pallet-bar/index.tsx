import { cn } from 'cn';

export type PalletSegmentT = {
  key: string;
  label: string;
  pallets: number;
  /** 칸 색 (bg-navy 등) */
  colorClassName: string;
};

type PalletBarPropsT = {
  title: string;
  description?: string;
  capacity: number;
  segments: PalletSegmentT[];
};

/** 컨테이너 한 대를 파렛트 칸으로 보여준다. 화주별로 색을 나누고 빈 칸은 테두리만 그린다 */
export function PalletBar({ title, description, capacity, segments }: PalletBarPropsT) {
  const cells = segments.flatMap(({ key, pallets, colorClassName }) =>
    Array.from({ length: pallets }, (_, index) => ({ id: `${key}-${index}`, colorClassName }))
  );
  const filled = cells.length;
  const emptyCount = Math.max(capacity - filled, 0);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-bold">
          {title}
          {description && (
            <span className="ml-2 text-sm font-medium text-muted-foreground">{description}</span>
          )}
        </p>
        <p className="font-bold num text-brand">
          {filled}/{capacity} · {Math.round((filled / capacity) * 100)}%
        </p>
      </div>

      <div className="flex gap-1">
        {cells.map(({ id, colorClassName }) => (
          <span key={id} className={cn('h-10 flex-1 rounded-[4px]', colorClassName)} />
        ))}
        {Array.from({ length: emptyCount }, (_, index) => (
          <span key={index} className="h-10 flex-1 rounded-[4px] border-2 border-line bg-white" />
        ))}
      </div>

      <div className="flex gap-5 text-muted-foreground">
        {segments.map(({ key, label, pallets, colorClassName }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn('size-3.5 rounded-[3px]', colorClassName)} />
            {label} <span className="num">{pallets}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
