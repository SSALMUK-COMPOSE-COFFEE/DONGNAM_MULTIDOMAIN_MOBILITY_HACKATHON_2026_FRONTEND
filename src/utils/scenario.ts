import type { ScenarioT } from '@/types/api';

export const getShipperName = (scenario: ScenarioT, shipperId: string) =>
  scenario.shippers.find(({ id }) => id === shipperId)?.name ?? shipperId;

export const OTHER_SHIPPER_LABEL = '다른 화주';

export const getOtherShipperLabel = (scenario: ScenarioT, shipperId: string) => {
  const name = scenario.shippers.find(({ id }) => id === shipperId)?.name;

  return name?.startsWith(OTHER_SHIPPER_LABEL) ? name : OTHER_SHIPPER_LABEL;
};

type ShortNameScenarioT = Pick<ScenarioT, 'shippers'> &
  Partial<Pick<ScenarioT, 'packhouses' | 'products' | 'lots'>>;

const CORPORATE_PREFIXES = [
  '농업회사법인',
  '영농조합법인',
  '농업법인',
  '협동조합',
  '주식회사',
  '유한회사',
  '유한책임회사',
  '합자회사',
  '합명회사',
  '사단법인',
  '재단법인',
  '㈜',
];
const CORPORATE_MARK = /[(（]\s*(?:주|유|합|사|재|농|영)\s*[)）]|㈜/g;
const TEST_PREFIX = /^[[(]?(?:e2e|qa|test|테스트)(?:[-_]?\d+)?[\])]?(?=[\s\-_:·]|$)[\s\-_:·]*/i;
const SHORT_NAME_MAX = 12;

const stripPrefixes = (name: string) => {
  let rest = name.trim();
  let changed = true;
  while (changed && rest) {
    changed = false;
    const marked = rest.replace(/^[(（]\s*(?:주|유|합|사|재|농|영)\s*[)）]\s*/, '');
    const tested = marked.replace(TEST_PREFIX, '');
    const prefix = CORPORATE_PREFIXES.find(item => tested.startsWith(item));
    const next = (prefix ? tested.slice(prefix.length) : tested).trim();
    if (next !== rest) {
      rest = next;
      changed = true;
    }
  }

  return rest
    .replace(CORPORATE_MARK, ' ')
    .split(/\s+/)
    .filter(word => word && !CORPORATE_PREFIXES.includes(word))
    .join(' ');
};

const ellipsis = (text: string) =>
  text.length > SHORT_NAME_MAX ? `${text.slice(0, SHORT_NAME_MAX - 1)}…` : text;

const regionProductOf = (scenario: ShortNameScenarioT, shipper: ScenarioT['shippers'][number]) => {
  const region = scenario.packhouses
    ?.find(({ id }) => id === shipper.packhouse_id)
    ?.region.trim()
    .split(/\s+/)
    .at(-1);
  const productId = scenario.lots?.find(({ shipper_id }) => shipper_id === shipper.id)?.product_id;
  const product = scenario.products
    ?.find(({ id }) => id === productId)
    ?.name.replace(/\s*[(（].*$/, '')
    .trim();

  return region && product ? `${region} ${product}` : '';
};

const GENERIC_WORDS = new Set([
  '화주',
  '농가',
  '업체',
  '회사',
  '법인',
  '수출',
  '수출농가',
  '수출업체',
  '테스트',
  'test',
  'e2e',
  'qa',
]);

const isMeaningful = (word: string) =>
  word.length > 1 && !GENERIC_WORDS.has(word.toLowerCase()) && !/^[\d\p{P}\p{S}]+$/u.test(word);

const shortNameCandidates = (
  scenario: ShortNameScenarioT,
  shipper: ScenarioT['shippers'][number]
) => {
  const raw = shipper.name.trim();
  if (raw.startsWith(OTHER_SHIPPER_LABEL)) return [raw];
  const stripped = stripPrefixes(raw);
  const first = stripped.split(' ').find(isMeaningful);
  const cleaned = first ? stripped : raw;
  const candidates = [
    first ?? ellipsis(raw),
    regionProductOf(scenario, shipper),
    ellipsis(cleaned),
    ellipsis(raw),
  ].filter(Boolean);

  return [...new Set(candidates.length > 0 ? candidates : [raw || shipper.id])];
};

const shortNameCache = new WeakMap<object, Map<string, string>>();

const duplicatesOf = (names: readonly string[]) => {
  const counts = new Map<string, number>();
  names.forEach(name => counts.set(name, (counts.get(name) ?? 0) + 1));

  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
};

const withSuffixes = (names: readonly string[]) => {
  const taken = new Set<string>();

  return names.map(name => {
    let next = name;
    for (let index = 2; taken.has(next); index += 1) next = `${name} ${index}`;
    taken.add(next);

    return next;
  });
};

const shortNamesOf = (scenario: ShortNameScenarioT) => {
  const cached = shortNameCache.get(scenario);
  if (cached) return cached;
  const candidates = scenario.shippers.map(shipper => shortNameCandidates(scenario, shipper));
  const levels = candidates.map(() => 0);
  const pick = () => candidates.map((own, index) => own[levels[index] ?? 0] ?? own[0] ?? '');
  let picked = pick();
  let duplicates = duplicatesOf(picked);
  while (duplicates.size > 0) {
    let bumped = false;
    picked.forEach((name, index) => {
      const own = candidates[index] ?? [];
      const level = levels[index] ?? 0;
      if (duplicates.has(name) && level < own.length - 1) {
        levels[index] = level + 1;
        bumped = true;
      }
    });
    if (!bumped) break;
    picked = pick();
    duplicates = duplicatesOf(picked);
  }
  const finalNames = withSuffixes(picked);
  const names = new Map(scenario.shippers.map(({ id }, index) => [id, finalNames[index] ?? id]));
  shortNameCache.set(scenario, names);

  return names;
};

export const getShipperShortName = (scenario: ShortNameScenarioT, shipperId: string) =>
  shortNamesOf(scenario).get(shipperId) ?? shipperId.split(' ')[0];

export const getProductName = (scenario: ScenarioT, productId: string) =>
  scenario.products.find(({ id }) => id === productId)?.name ?? productId;

/** 'HKHKG' → '홍콩항' */
export const getPortName = (scenario: ScenarioT, portId: string) =>
  scenario.ports.find(({ id }) => id === portId)?.name ?? portId;
