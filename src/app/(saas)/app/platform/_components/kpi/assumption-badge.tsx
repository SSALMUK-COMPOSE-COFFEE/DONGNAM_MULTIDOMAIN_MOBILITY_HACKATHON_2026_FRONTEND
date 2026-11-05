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
      <span className="min-w-0 break-words">
        {source
          .replace(/D13: /g, '')
          .replace(/최종 기획서: /g, '')
          .replace('기획서 ㅍ3 8-1 ', '')
          .replace('기획서 ㅍ3 8-3: ', '')
          .replace('기획서 점유율 가정', '점유율 가정')
          .replace('점유율은 기획서 가정', '점유율 가정')
          .replace('1년 차(기획서 8-3)와', '1년 차 예상 물량과')
          .replace('changelog/03 SOM:', '목표 시장 물량:')}
      </span>
    </p>
  );
}
