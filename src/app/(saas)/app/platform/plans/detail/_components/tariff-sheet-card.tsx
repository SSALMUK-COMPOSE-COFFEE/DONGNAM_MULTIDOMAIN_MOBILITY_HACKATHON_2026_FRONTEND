import { cn } from 'cn';

import {
  billingChipClass,
  billingFieldsOf,
  billingRuleLabel,
  usageFeePerPalletOf,
} from '@/app/(saas)/app/platform/_components/billing';
import { won } from '@/app/(saas)/app/platform/_components/m2-format';
import { CompareBars } from '@/components/map-hero';
import type { ScenarioT, TariffSheetT } from '@/types/api';
import { getProductName } from '@/utils/scenario';

export function TariffSheetCard({
  tariff,
  scenario,
}: {
  tariff: TariffSheetT;
  scenario: ScenarioT;
}) {
  const max = Math.max(tariff.air_total, tariff.sea_total);
  const seaWins = tariff.sea_total <= tariff.air_total;
  const billing = billingFieldsOf(tariff);
  const rule = billing.billingRule === 'usage_fee' ? 'usage_fee' : 'performance';
  const feeLabel = billingRuleLabel(rule, tariff.fee_rate, usageFeePerPalletOf(scenario));

  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <h2 className="m2-h2">{getProductName(scenario, tariff.product_id)} 1파렛트 정산표</h2>
        <div className="flex flex-wrap justify-end gap-1.5">
          {billing.pilot ? <span className="m2-chip m2-chip-ok">시범 항차</span> : null}
          <span className={cn('m2-chip', billingChipClass(rule))}>{feeLabel}</span>
          <span className="m2-chip">원 단위</span>
        </div>
      </div>
      <CompareBars
        className="m2-num"
        rows={[
          {
            label: '해상',
            value: won(tariff.sea_total),
            ratio: max > 0 ? tariff.sea_total / max : 0,
            tone: seaWins ? 'navy' : 'base',
          },
          {
            label: '항공',
            value: won(tariff.air_total),
            ratio: max > 0 ? tariff.air_total / max : 0,
            tone: seaWins ? 'base' : 'navy',
          },
        ]}
      />
      <table className="m2-table mt-3">
        <thead>
          <tr>
            <th>항목</th>
            <th className="r">항공</th>
            <th className="r">해상</th>
          </tr>
        </thead>
        <tbody>
          {tariff.lines.map(({ key, label, air, sea, air_assumed, sea_assumed }) => (
            <tr key={key}>
              <td className="whitespace-normal">{label}</td>
              <td className="r m2-num">
                <AssumedValue value={air} isAssumed={air_assumed} />
              </td>
              <td className="r m2-num">
                <AssumedValue value={sea} isAssumed={sea_assumed} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="m2-lines">
        <div>
          <span>파렛트당 절감</span>
          <b className="text-m2-ok-ink">{won(tariff.savings_per_pallet)}</b>
        </div>
        <div>
          <span>{feeLabel}</span>
          <b>{won(tariff.fee_per_pallet)}</b>
        </div>
        <div>
          <span>화주 몫</span>
          <b>{won(tariff.shipper_share_per_pallet)}</b>
        </div>
      </div>
    </section>
  );
}

function AssumedValue({ value, isAssumed }: { value: number; isAssumed: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {isAssumed ? <span className="m2-chip px-1.5 py-0 text-[10.5px]">가정</span> : null}
      {won(value)}
    </span>
  );
}
