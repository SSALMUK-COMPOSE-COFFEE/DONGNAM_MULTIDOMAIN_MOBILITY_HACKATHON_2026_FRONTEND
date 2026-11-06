import { Fragment } from 'react';

import {
  billingFieldsOf,
  billingRuleLabel,
  usageFeePerPalletOf,
} from '@/app/(saas)/app/platform/_components/billing';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { feeRateOf, won } from '@/app/(saas)/app/platform/_components/m2-format';
import type { SaasPlanSessionT } from '@/types/api-saas';
import { getShipperName } from '@/utils/scenario';

const BASIS_LABEL: Record<string, string> = {
  tariff: '정산표 단가',
  operational: '운영비 기준',
  mixed: '정산표·운영비 혼합',
};

const AIR_BASELINE_LABEL = '단독 항공 대비';

type MoneyKeyT = 'baseline_cost' | 'shared_cost' | 'savings' | 'fee' | 'shipper_gain';

type SavingsRowT = {
  key: string;
  shipperId: string;
  pallets: number;
  baseline: number;
  shared: number;
  savings: number;
  fee: number;
  gain: number;
  source: unknown;
  isAir: boolean;
};

type SavingsGroupT = {
  key: string;
  title: string;
  meta: string;
  rows: SavingsRowT[];
  total: { savings: number; fee: number; gain: number } | null;
};

const groupsOf = (session: SaasPlanSessionT): SavingsGroupT[] => {
  const { plan } = session;
  const containerSettlements = plan.container_settlements ?? [];
  const seaGroups = containerSettlements.map(container => {
    const basis = container.shippers[0]?.basis ?? '';

    return {
      key: container.container_id,
      title: container.container_id,
      meta: [`${container.pallets}/${container.capacity_pallets} 파렛트`, BASIS_LABEL[basis] ?? '']
        .filter(Boolean)
        .join(' · '),
      rows: container.shippers.map(row => ({
        key: `${container.container_id}:${row.shipper_id}`,
        shipperId: row.shipper_id,
        pallets: row.pallets,
        baseline: row.baseline_cost,
        shared: row.shared_cost,
        savings: row.savings,
        fee: row.fee,
        gain: row.shipper_gain,
        source: row,
        isAir: false,
      })),
      total: {
        savings: container.total_savings,
        fee: container.total_fee,
        gain: container.total_shipper_gain,
      },
    };
  });
  const airRows = plan.settlements
    .filter(({ air_pallets }) => air_pallets > 0)
    .map(settlement => {
      const seaRows = containerSettlements.flatMap(({ shippers }) =>
        shippers.filter(({ shipper_id }) => shipper_id === settlement.shipper_id)
      );
      const seaSum = (key: MoneyKeyT) => seaRows.reduce((sum, row) => sum + row[key], 0);

      return {
        key: `air:${settlement.shipper_id}`,
        shipperId: settlement.shipper_id,
        pallets: settlement.air_pallets,
        baseline: settlement.baseline_cost - seaSum('baseline_cost'),
        shared: settlement.shared_cost - seaSum('shared_cost'),
        savings: settlement.savings - seaSum('savings'),
        fee: settlement.fee - seaSum('fee'),
        gain: settlement.shipper_gain - seaSum('shipper_gain'),
        source: settlement,
        isAir: true,
      };
    });
  const airPallets = airRows.reduce((sum, { pallets }) => sum + pallets, 0);

  return airRows.length > 0
    ? [
        ...seaGroups,
        {
          key: 'air',
          title: '항공',
          meta: `${airPallets} 파렛트 · 공동적재 없이 단독 항공 운임`,
          rows: airRows,
          total: null,
        },
      ]
    : seaGroups;
};

export function ShipperSavingsCard({ session }: { session: SaasPlanSessionT }) {
  const { scenario, plan } = session;
  const groups = groupsOf(session);
  const feeRate = feeRateOf(scenario);
  const usagePerPallet = usageFeePerPalletOf(scenario);
  const settlementOf = new Map(plan.settlements.map(row => [row.shipper_id, row]));

  const feeLabelOf = (row: SavingsRowT) => {
    if (row.isAir) {
      return {
        rule: row.fee > 0 ? billingRuleLabel('performance', feeRate, usagePerPallet) : null,
        baseline: AIR_BASELINE_LABEL,
      };
    }
    const own = billingFieldsOf(row.source);
    const fallback = billingFieldsOf(settlementOf.get(row.shipperId));

    return {
      rule: billingRuleLabel(own.billingRule ?? fallback.billingRule, feeRate, usagePerPallet),
      baseline: own.baselineLabel ?? fallback.baselineLabel,
    };
  };

  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">화주별 총비용 절감액</h2>
          <div className="m2-sub">컨테이너·항공별 단독 발송 대비 절감과 플랫폼 보수입니다.</div>
        </div>
        <span className="m2-chip">원 단위</span>
      </div>
      {groups.length === 0 ? (
        <EmptyState compact title="정산할 배정이 없습니다" />
      ) : (
        <div className="-mx-2.5 overflow-x-auto px-2.5">
          <table className="m2-table">
            <thead>
              <tr>
                <th>화주</th>
                <th className="r">단독 → 공동</th>
                <th className="r">절감</th>
                <th className="r">보수</th>
                <th className="r">화주 몫</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => (
                <Fragment key={group.key}>
                  <tr className="[&>td]:bg-[rgba(15,27,51,0.025)]">
                    <td colSpan={5} className="whitespace-normal">
                      <span className="font-bold text-m2-ink">{group.title}</span>
                      <span className="ml-2 text-[12px] text-m2-muted">{group.meta}</span>
                    </td>
                  </tr>
                  {group.rows.map(row => {
                    const label = feeLabelOf(row);
                    return (
                      <tr key={row.key}>
                        <td>
                          <div className="m2-who">
                            {getShipperName(scenario, row.shipperId)}
                            <small className="m2-num">
                              {[`${row.pallets}파렛트`, label.baseline ?? '']
                                .filter(Boolean)
                                .join(' · ')}
                            </small>
                          </div>
                        </td>
                        <td className="r m2-num">
                          <div className="text-[12px] text-m2-muted">{won(row.baseline)}</div>
                          <div>{won(row.shared)}</div>
                        </td>
                        <td className="r m2-num font-bold text-m2-ok-ink">{won(row.savings)}</td>
                        <td className="r m2-num">
                          <div>{won(row.fee)}</div>
                          {label.rule ? (
                            <div className="text-[11.5px] text-m2-muted">{label.rule}</div>
                          ) : null}
                        </td>
                        <td className="r m2-num">{won(row.gain)}</td>
                      </tr>
                    );
                  })}
                  {group.total ? (
                    <tr className="font-semibold">
                      <td colSpan={2} className="r text-[12px] text-m2-muted">
                        {group.title} 합계
                      </td>
                      <td className="r m2-num text-m2-ok-ink">{won(group.total.savings)}</td>
                      <td className="r m2-num">{won(group.total.fee)}</td>
                      <td className="r m2-num">{won(group.total.gain)}</td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
