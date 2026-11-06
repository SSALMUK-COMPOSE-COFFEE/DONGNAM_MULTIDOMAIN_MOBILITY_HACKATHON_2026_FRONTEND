import type { ColdchainResidualRiskT } from '@/types/saas-platform';

const LEVEL_CHIP: Record<ColdchainResidualRiskT['level'], { label: string; chip: string }> = {
  warning: { label: '주의', chip: 'm2-chip m2-chip-warn' },
  info: { label: '참고', chip: 'm2-chip' },
};

const formatValue = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

type ColdchainResidualRisksPropsT = {
  risks: readonly ColdchainResidualRiskT[];
};

export function ColdchainResidualRisks({ risks }: ColdchainResidualRisksPropsT) {
  return (
    <section className="m2-card" aria-label="잔여위험">
      <div className="m2-card-h">
        <h2 className="m2-h2">잔여위험 (손실률에 반영하지 않은 위험)</h2>
      </div>
      {risks.length === 0 ? (
        <p className="m2-sub">측정값이 들어오면 잔여위험을 계산합니다.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5">
          {risks.map(risk => {
            const level = LEVEL_CHIP[risk.level];

            return (
              <li key={risk.kind} className="m2-block flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="m2-h3 min-w-0 flex-1">{risk.title}</h3>
                  <span className={level.chip}>{level.label}</span>
                </div>
                <p className="m2-num text-[18px] font-bold tracking-[-0.02em]">
                  {formatValue(risk.value)}
                  <small className="ml-0.5 text-[12px] font-semibold text-m2-ink-2">
                    {risk.unit}
                  </small>
                  <span className="ml-2 text-[12px] font-medium text-m2-muted">
                    기준 {formatValue(risk.threshold.value)}
                    {risk.threshold.unit}
                  </span>
                </p>
                <p className="text-[12.5px] text-m2-ink-2">{risk.message}</p>
                <p className="text-[11.5px] text-m2-muted">{risk.threshold.source}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
