import planSessionFixture from '@/mocks/fixtures/plan-session.json';
import lossRatesFixture from '@/mocks/saas/fixtures/loss-rates.json';
import type { MockLotT } from '@/mocks/saas/state';
import type { PlanSessionT } from '@/types/api';
import type { LossTableT } from '@/types/saas-analysis';
import type { ExpectedLossT, ShipperLotT } from '@/types/saas-shipper';

const LEARNED_BASIS = '도착 검수 학습';
const DEFAULT_BASIS = '기본값(가정)';

const lossTable = lossRatesFixture as unknown as LossTableT;
const scenario = (planSessionFixture as unknown as PlanSessionT).scenario;

const seaBaseLossRateOf = (productId: string) => {
  const costs = scenario.cost_params;
  const param =
    costs?.product_costs?.[productId]?.sea_base_loss_rate ??
    costs?.default_product_cost?.sea_base_loss_rate ??
    null;

  return param ? { rate: param.value, source: param.source } : { rate: 0, source: null };
};

export const mockExpectedLoss = (productId: string, destination: string): ExpectedLossT => {
  const cell = lossTable.cells.find(
    item => item.product_id === productId && item.destination === destination && item.mode === 'sea'
  );
  if (cell && cell.observations > 0) {
    return {
      rate: cell.posterior_rate,
      mode: 'sea',
      basis: LEARNED_BASIS,
      n_observations: cell.observations,
      source: cell.basis,
    };
  }

  const fallback = cell
    ? { rate: cell.posterior_rate, source: cell.prior_source }
    : seaBaseLossRateOf(productId);

  return { ...fallback, mode: 'sea', basis: DEFAULT_BASIS, n_observations: 0 };
};

export const withExpectedLoss = (lot: MockLotT): ShipperLotT => ({
  ...lot,
  expected_loss: mockExpectedLoss(lot.product_id, lot.destination),
});
