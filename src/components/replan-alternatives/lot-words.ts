import type { ScenarioT } from '@/types/api';
import { getShipperShortName } from '@/utils/scenario';

type LotLikeT = Pick<ScenarioT['lots'][number], 'id' | 'shipper_id' | 'ready_date'>;

export type LotNameMapT = ReadonlyMap<string, string>;

const LEFTOVER_LOT_ID = /\blot-[A-Za-z0-9][\w-]*/g;
const UNKNOWN_LOT_LABEL = '출하';

const byReadyDate = (a: LotLikeT, b: LotLikeT) =>
  a.ready_date.localeCompare(b.ready_date) || a.id.localeCompare(b.id);

const groupByShipper = (lots: readonly LotLikeT[]) => {
  const byShipper = new Map<string, LotLikeT[]>();
  lots.forEach(lot => {
    byShipper.set(lot.shipper_id, [...(byShipper.get(lot.shipper_id) ?? []), lot]);
  });

  return byShipper;
};

export const lotNameMap = (
  scenario: ScenarioT,
  extraLots: readonly LotLikeT[] = []
): LotNameMapT => {
  const known = new Set(scenario.lots.map(({ id }) => id));
  const base = groupByShipper(scenario.lots);
  const extra = groupByShipper(extraLots.filter(({ id }) => !known.has(id)));
  const shipperIds = [...new Set([...base.keys(), ...extra.keys()])];

  return new Map(
    shipperIds.flatMap(shipperId => {
      const shortName = getShipperShortName(scenario, shipperId);
      const ordered = [
        ...[...(base.get(shipperId) ?? [])].sort(byReadyDate),
        ...[...(extra.get(shipperId) ?? [])].sort(byReadyDate),
      ];

      return ordered.map((lot, index) => [lot.id, `${shortName} ${index + 1}번 출하`] as const);
    })
  );
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const withLotNames = (text: string, names: LotNameMapT) => {
  const ids = [...names.keys()].filter(Boolean).sort((a, b) => b.length - a.length);
  const named =
    ids.length > 0
      ? text.replace(
          new RegExp(`(?:${ids.map(escapeRegExp).join('|')})(?![\\w-])`, 'g'),
          id => names.get(id) ?? id
        )
      : text;

  return named.replace(LEFTOVER_LOT_ID, UNKNOWN_LOT_LABEL);
};
