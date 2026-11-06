import { fmtMonthDayTime } from '@/app/(saas)/app/shipper/_components/shipper-format';
import type { ShipperSettlementT } from '@/types/saas-shipper';

export const AIR_PLACEHOLDER = '항공';
export const UNASSIGNED_PLACEHOLDER = '배정 전';

type PalletSplitT = { seaPallets: number; airPallets: number };

export const palletSplitByPlan = (rows: readonly ShipperSettlementT[] | null | undefined) => {
  const split = new Map<string, PalletSplitT>();
  for (const row of rows ?? []) {
    const prev = split.get(row.plan_id) ?? { seaPallets: 0, airPallets: 0 };
    split.set(row.plan_id, {
      seaPallets: prev.seaPallets + row.sea_pallets,
      airPallets: prev.airPallets + row.air_pallets,
    });
  }

  return split;
};

export const noVesselLabel = (split: PalletSplitT | null | undefined) =>
  split && split.airPallets > 0 && split.seaPallets === 0
    ? AIR_PLACEHOLDER
    : UNASSIGNED_PLACEHOLDER;

export const vesselText = (vessel: string | null, split: PalletSplitT | null | undefined) =>
  vessel ?? noVesselLabel(split);

export const departureText = (departure: string | null, split: PalletSplitT | null | undefined) =>
  departure ? `출항 ${fmtMonthDayTime(departure)}` : noVesselLabel(split);
