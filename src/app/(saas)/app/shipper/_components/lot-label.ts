import type { ShipperCatalogT } from '@/types/saas-shipper';
import { getProductName } from '@/utils/scenario';

const so2Text = (text: string) => text.replace(/SO2/g, 'SO₂');

type LotLikeT = {
  id: string;
  product_id: string;
  pallets: number;
  ready_date?: string | null;
};

const paddedMonthDay = (iso: string | null | undefined) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

  return match ? `${match[2]}/${match[3]}` : '';
};

export const lotLabelFrom = (
  product: string,
  readyDate: string | null | undefined,
  pallets: number
) => {
  const day = paddedMonthDay(readyDate);

  return [
    `${so2Text(product)}${day ? ` ${day}` : ''}`,
    `${pallets.toLocaleString('ko-KR')}파렛트`,
  ].join(' · ');
};

export const lotDayLabel = (readyDate: string | null | undefined) => {
  const day = paddedMonthDay(readyDate);

  return day ? `내 출하 ${day}` : '내 출하';
};

export const lotLabel = (lot: LotLikeT, catalog: ShipperCatalogT | null) =>
  lotLabelFrom(
    catalog ? getProductName(catalog, lot.product_id) : '출하',
    lot.ready_date,
    lot.pallets
  );

export type LotLabelMapT = ReadonlyMap<string, string>;

export const lotLabelMap = (
  lots: readonly LotLikeT[] | null | undefined,
  catalog: ShipperCatalogT | null
): LotLabelMapT => new Map((lots ?? []).map(lot => [lot.id, lotLabel(lot, catalog)]));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const withLotLabels = (text: string, labels: LotLabelMapT) => {
  const ids = [...labels.keys()].filter(Boolean).sort((a, b) => b.length - a.length);
  if (ids.length === 0) return text;
  const pattern = new RegExp(ids.map(escapeRegExp).join('|'), 'g');

  return text.replace(pattern, id => labels.get(id) ?? id);
};
