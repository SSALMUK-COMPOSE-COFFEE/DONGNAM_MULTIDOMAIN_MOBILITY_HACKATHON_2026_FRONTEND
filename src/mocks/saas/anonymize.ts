import type { ScenarioT } from '@/types/api';

const label = (index: number) => {
  let letters = '';
  let rest = index + 1;
  while (rest > 0) {
    const remainder = (rest - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    rest = Math.floor((rest - 1) / 26);
  }

  return letters;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const createAnonymizer = (scenario: ScenarioT, ownShipperIds: readonly string[]) => {
  const own = new Set(ownShipperIds);
  const ownPackhouses = new Set(
    scenario.shippers.filter(shipper => own.has(shipper.id)).map(shipper => shipper.packhouse_id)
  );
  const packhouses = new Map(scenario.packhouses.map(packhouse => [packhouse.id, packhouse]));
  const tokens = new Map<string, string>();
  const hiddenPackhouses = new Set<string>();

  scenario.shippers
    .filter(shipper => !own.has(shipper.id))
    .forEach((shipper, index) => {
      const letter = label(index);
      tokens.set(shipper.id, `anon-${letter}`);
      tokens.set(shipper.name, `화주 ${letter}`);

      if (!ownPackhouses.has(shipper.packhouse_id)) {
        const anonId = `anon-ph-${letter}`;
        tokens.set(shipper.packhouse_id, anonId);
        hiddenPackhouses.add(anonId);
        const packhouse = packhouses.get(shipper.packhouse_id);
        if (packhouse) tokens.set(packhouse.name, `화주 ${letter} 선과장`);
      }

      scenario.lots
        .filter(lot => lot.shipper_id === shipper.id)
        .forEach((lot, lotIndex) => tokens.set(lot.id, `anon-${letter}-${lotIndex + 1}`));
    });

  const ordered = [...tokens.keys()].sort((a, b) => b.length - a.length);
  const pattern = ordered.length ? new RegExp(ordered.map(escapeRegExp).join('|'), 'g') : null;

  const text = (value: string) =>
    pattern ? value.replace(pattern, match => tokens.get(match) ?? match) : value;

  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') return text(value);
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [text(key), walk(item)])
      );
    }

    return value;
  };

  const session = <T>(payload: T): T => {
    const result = walk(payload) as { scenario?: ScenarioT };
    result.scenario?.packhouses.forEach(packhouse => {
      if (!hiddenPackhouses.has(packhouse.id)) return;
      Object.assign(packhouse, { region: '', lat: null, lon: null });
    });

    return result as T;
  };

  return { text, walk, session };
};
