import { lotNameMap, withLotNames } from '@/components/replan-alternatives/lot-words';
import type { ReplanResponseT, ScenarioT } from '@/types/api';
import { getShipperShortName } from '@/utils/scenario';

type ReplanExplanationPropsT = {
  replan: ReplanResponseT;
  scenario: ScenarioT;
};

export function ReplanExplanation({ replan, scenario }: ReplanExplanationPropsT) {
  const { explanation, alternatives, recommended_id: recommendedId, solve_ms: solveMs } = replan;
  const recommended = alternatives.find(({ id, feasible }) => id === recommendedId && feasible);
  const excludedCount = alternatives.filter(({ feasible }) => !feasible).length;
  const isLlm = explanation?.generated_by === 'llm';
  const messages = explanation?.shipper_messages ?? [];
  const lotNames = lotNameMap(scenario);

  return (
    <section className="m2-card flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m2-h2">
          {alternatives.length}가지 안을 다시 계산했습니다
          {recommended && (
            <>
              {' '}
              · 추천 <span className="text-m2-brand-ink">{recommended.label}</span>
            </>
          )}
        </h3>
        <span className="m2-num text-[12px] text-m2-faint">
          재계산 {solveMs.toLocaleString('ko-KR')}ms
          {excludedCount > 0 && ` · 실행 불가 ${excludedCount}안 비교 제외`}
        </span>
      </div>

      {explanation ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="m2-lbl">운영자 요약</span>
            {isLlm ? (
              <span className="m2-chip m2-chip-grape">
                AI 작성{explanation.model ? ` · ${explanation.model}` : ''}
              </span>
            ) : (
              <span className="m2-chip">템플릿 문장</span>
            )}
          </div>
          <p className="text-[14px] leading-relaxed text-m2-ink">
            {withLotNames(explanation.operator_summary, lotNames)}
          </p>
          {isLlm && (
            <p className="text-[11.5px] text-m2-faint">
              AI가 계산 결과를 문장으로 옮긴 것입니다. 금액·파렛트 수는 아래 카드 값이 기준입니다.
            </p>
          )}
        </div>
      ) : (
        <p className="m2-sub mt-0">요약 문장이 없습니다. 아래 카드에서 안별 변화를 비교하세요.</p>
      )}

      {messages.length > 0 && (
        <details className="text-[12.5px]">
          <summary className="cursor-pointer text-m2-muted">
            화주에게 보낼 안내 {messages.length}건
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {messages.map(({ shipper_id, message }) => (
              <li key={shipper_id} className="text-m2-ink-2">
                <span className="font-semibold">{getShipperShortName(scenario, shipper_id)}</span>{' '}
                {withLotNames(message, lotNames)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
