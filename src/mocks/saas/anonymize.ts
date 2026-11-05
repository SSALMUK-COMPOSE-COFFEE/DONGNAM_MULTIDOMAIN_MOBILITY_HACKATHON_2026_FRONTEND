import type { ScenarioT } from '@/types/api';

const OTHER_SHIPPER_LABEL = '다른 화주';

const label = (index: number) => String(index + 1);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isAscii = (value: string) => [...value].every(char => char.charCodeAt(0) < 128);

const tokenPattern = (token: string) => {
  const escaped = escapeRegExp(token);

  return isAscii(token) ? `(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])` : escaped;
};

const shortName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const createAnonymizer = (scenario: ScenarioT, ownShipperIds: readonly string[]) => {
  const own = new Set(ownShipperIds);
  const ownPackhouses = new Set(
    scenario.shippers.filter(shipper => own.has(shipper.id)).map(shipper => shipper.packhouse_id)
  );
  const ownShorts = new Set(
    scenario.shippers.filter(shipper => own.has(shipper.id)).map(shipper => shortName(shipper.name))
  );
  const packhouses = new Map(scenario.packhouses.map(packhouse => [packhouse.id, packhouse]));
  const shippers = new Map(scenario.shippers.map(shipper => [shipper.id, shipper]));
  const shipperIds = scenario.shippers.map(shipper => shipper.id);
  const extraIds = [...new Set(scenario.lots.map(lot => lot.shipper_id))]
    .filter(id => !shippers.has(id))
    .sort();
  const tokens = new Map<string, string>();
  const hiddenPackhouses = new Set<string>();

  [...shipperIds, ...extraIds]
    .filter(id => !own.has(id))
    .forEach((shipperId, index) => {
      const letter = label(index);
      tokens.set(shipperId, `anon-${letter}`);

      const shipper = shippers.get(shipperId);
      if (shipper) {
        tokens.set(shipper.name, `${OTHER_SHIPPER_LABEL} ${letter}`);
        const short = shortName(shipper.name);
        if (short.length >= 2 && !ownShorts.has(short) && !tokens.has(short)) {
          tokens.set(short, `${OTHER_SHIPPER_LABEL} ${letter}`);
        }

        if (!ownPackhouses.has(shipper.packhouse_id)) {
          const anonId = `anon-ph-${letter}`;
          tokens.set(shipper.packhouse_id, anonId);
          hiddenPackhouses.add(anonId);
          const packhouse = packhouses.get(shipper.packhouse_id);
          if (packhouse) tokens.set(packhouse.name, `${OTHER_SHIPPER_LABEL} ${letter} 출하 장소`);
        }
      }

      scenario.lots
        .filter(lot => lot.shipper_id === shipperId)
        .forEach((lot, lotIndex) => tokens.set(lot.id, `anon-${letter}-${lotIndex + 1}`));
    });

  const ordered = [...tokens.keys()].filter(Boolean).sort((a, b) => b.length - a.length);
  const pattern = ordered.length ? new RegExp(ordered.map(tokenPattern).join('|'), 'g') : null;

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
