import type { SeasonCheckT } from '@/types/saas-shipper';

const SEASON_SOURCE = '가정(공식 품목별 수출 시기 자료 확인 필요)';

const EXPORT_SEASONS: { label: string; keys: string[]; months: number[] }[] = [
  { label: '딸기', keys: ['strawberry', '딸기'], months: [11, 12, 1, 2, 3, 4, 5] },
  { label: '포도', keys: ['grape', '포도', '머스캣'], months: [10, 11, 12, 1, 2, 3] },
];

type SeasonProductT = { id: string; name: string };

export const seasonCheckOf = (
  product: SeasonProductT | undefined,
  readyDate: string
): SeasonCheckT | null => {
  if (!product) return null;
  const text = `${product.id} ${product.name}`.toLowerCase();
  const season = EXPORT_SEASONS.find(({ keys }) => keys.some(key => text.includes(key)));
  if (!season) return null;
  const month = Number(readyDate.slice(5, 7));

  return {
    product_id: product.id,
    label: season.label,
    months: season.months,
    in_season: season.months.includes(month),
    source: SEASON_SOURCE,
  };
};

export const seasonWarningOf = (season: SeasonCheckT | null, readyDate: string) =>
  season && !season.in_season
    ? `${season.label} 수출 시기(${season.months[0]}~${season.months[season.months.length - 1]}월) 밖의 출하일입니다(${readyDate}). 등록은 그대로 됩니다(출처: ${season.source})`
    : null;
