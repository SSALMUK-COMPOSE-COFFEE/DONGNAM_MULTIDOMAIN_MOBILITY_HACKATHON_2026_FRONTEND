import { cn } from 'cn';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FuelShockCaseT, FuelShockResultT } from '@/types/api';
import { formatManwon, formatSignedManwon } from '@/utils/format';

type SurchargeCardPropsT = {
  result: FuelShockResultT;
  selectedIndex: number;
  onSelect: (index: number) => void;
  baseline: FuelShockCaseT;
};

/** 할증료를 고르면 파렛트당 항공 운임과, 배정이 바뀌기 시작하는 할증료(임계값)를 보여준다 */
export function SurchargeCard({ result, selectedIndex, onSelect, baseline }: SurchargeCardPropsT) {
  const { cases, thresholds, pallet_kg, solve_count, solve_ms } = result;
  const selected = cases[selectedIndex] ?? baseline;
  const upThreshold = thresholds.find(
    ({ direction, surcharge_per_kg }) => direction === 'up' && surcharge_per_kg !== null
  );
  const thresholdPallets =
    upThreshold?.switches.reduce((sum, { pallets }) => sum + pallets, 0) ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>항공 유류할증료</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        <div className="grid grid-cols-2 gap-3">
          {cases.map(({ surcharge_per_kg, is_baseline }, index) => (
            <button
              key={surcharge_per_kg}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                'rounded-2xl border-2 px-5 py-4 text-left transition-colors',
                index === selectedIndex
                  ? 'border-navy bg-navy text-white'
                  : 'border-line bg-white hover:border-brand'
              )}
            >
              <span className="block text-sm opacity-70">
                {is_baseline ? '인상 전' : '인상 후'}
              </span>
              <span className="text-3xl font-bold num">{surcharge_per_kg.toLocaleString()}</span>
              <span className="ml-1 text-sm">원/kg</span>
            </button>
          ))}
        </div>

        <div>
          <p className="text-sm text-muted-foreground">
            딸기 1파렛트({pallet_kg}kg) 항공 운임 · kg당{' '}
            <span className="num">{selected.air_rate_per_kg.toLocaleString()}</span>원
          </p>
          <p className="text-4xl font-bold num text-air">
            {formatManwon(selected.air_freight_per_pallet)}
            <span className="ml-1 text-lg font-medium text-muted-foreground">만 원</span>
            {!selected.is_baseline && (
              <span className="ml-3 text-xl text-berry">
                {formatSignedManwon(
                  selected.air_freight_per_pallet - baseline.air_freight_per_pallet
                )}
                만
              </span>
            )}
          </p>
        </div>

        {upThreshold?.surcharge_per_kg && (
          <p className="rounded-2xl bg-brand-soft px-5 py-4 leading-relaxed text-navy">
            할증료가 kg당{' '}
            <span className="font-bold num text-brand">
              {upThreshold.surcharge_per_kg.toLocaleString()}원
            </span>
            을 넘으면 항공 <span className="font-bold num">{thresholdPallets}</span>파렛트가 해상
            공동적재로 바뀐다
          </p>
        )}

        <p className="mt-auto text-sm num text-muted-foreground">
          출처 한국농어민신문 2026.4 (4.16 인상)
          <br />
          할증료별 재계산 {solve_count}회, {solve_ms.toLocaleString()}ms
        </p>
      </CardContent>
    </Card>
  );
}
