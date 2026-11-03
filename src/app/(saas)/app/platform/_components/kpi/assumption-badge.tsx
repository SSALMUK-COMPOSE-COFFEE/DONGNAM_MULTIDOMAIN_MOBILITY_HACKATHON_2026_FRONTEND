import { cn } from 'cn';

type AssumptionBadgePropsT = {
  className?: string;
};

export function AssumptionBadge({ className }: AssumptionBadgePropsT) {
  return <span className={cn('m2-chip m2-chip-warn shrink-0', className)}>가정</span>;
}

type SourceLinePropsT = {
  source: string;
  assumed?: boolean;
};

export function SourceLine({ source, assumed = false }: SourceLinePropsT) {
  return (
    <p className="flex items-start gap-1.5 text-[11.5px] leading-[1.5] text-m2-muted">
      {assumed ? <AssumptionBadge /> : null}
      <span className="min-w-0 break-words">{source}</span>
    </p>
  );
}
