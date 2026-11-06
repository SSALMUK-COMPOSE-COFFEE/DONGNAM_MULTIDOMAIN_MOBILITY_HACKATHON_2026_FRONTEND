import { CostCompare } from '@/components/cost-compare';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ScenarioT, TariffSheetT } from '@/types/api';
import { formatManwon } from '@/utils/format';
import { getProductName } from '@/utils/scenario';

type TariffCardPropsT = {
  tariff: TariffSheetT;
  scenario: ScenarioT;
};

/** 1파렛트 기준 항공·해상 총비용 정산표. 성과보수 정산의 기준 단가다 */
export function TariffCard({ tariff, scenario }: TariffCardPropsT) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {getProductName(scenario, tariff.product_id)} 1파렛트 정산표
          <span className="ml-2 text-base font-medium text-muted-foreground">만 원</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <CostCompare
          rows={[
            {
              label: '해상',
              value: tariff.sea_total,
              isChosen: tariff.sea_total <= tariff.air_total,
            },
            {
              label: '항공',
              value: tariff.air_total,
              isChosen: tariff.air_total < tariff.sea_total,
            },
          ]}
        />

        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-1.5 text-left font-medium">항목</th>
              <th className="py-1.5 text-right font-medium">항공</th>
              <th className="py-1.5 text-right font-medium">해상</th>
            </tr>
          </thead>
          <tbody>
            {tariff.lines.map(({ key, label, air, sea, air_assumed, sea_assumed }) => (
              <tr key={key} className="border-b last:border-0">
                <td className="py-1.5">{label}</td>
                <td className="py-1.5 text-right">
                  <AssumedValue value={air} isAssumed={air_assumed} />
                </td>
                <td className="py-1.5 text-right">
                  <AssumedValue value={sea} isAssumed={sea_assumed} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="rounded-2xl bg-brand-soft px-5 py-4 text-center text-lg font-bold text-brand">
          → 파렛트당 <span className="num">{formatManwon(tariff.savings_per_pallet)}만 원</span>{' '}
          절감
          <span className="mt-1 block text-sm font-medium text-navy">
            수수료 <span className="num">{formatManwon(tariff.fee_per_pallet)}만</span> · 화주 몫{' '}
            <span className="num">{formatManwon(tariff.shipper_share_per_pallet)}만 원</span>
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

function AssumedValue({ value, isAssumed }: { value: number; isAssumed: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {isAssumed && (
        <Badge variant="outline" className="h-4 px-1 text-[10px]">
          가정
        </Badge>
      )}
      <span className="num">{formatManwon(value)}</span>
    </span>
  );
}
