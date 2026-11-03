import { HttpResponse, http } from 'msw';

import planSessionFixture from '@/mocks/fixtures/plan-session.json';
import { api, authorize, fail } from '@/mocks/saas/access';
import type { MockOrgT } from '@/mocks/saas/orgs';
import { mockDb, moveSessionOrg, onMockReset } from '@/mocks/saas/state';
import type { PlanSessionT } from '@/types/api';
import type {
  PackhouseCreateT,
  PackhousePatchT,
  PackhouseT,
  ShipperProfilePatchT,
  ShipperProfileT,
  ShipperProfileViewT,
} from '@/types/saas-shipper';

type StoredPackhouseT = Omit<PackhouseT, 'in_use'>;
type OrgProfileT = { profile: ShipperProfileT | null; packhouses: StoredPackhouseT[] };

const SEED_SOURCE = '시드';
const REGISTERED_SOURCE = '등록';
const SANDBOX_LOCKED = '데모(sandbox) 조직의 화주 정보는 바꿀 수 없습니다';
const PACKHOUSE_NOT_FOUND = '선과장을 찾을 수 없습니다';
const PROFILE_NOT_FOUND = '화주 프로필이 없습니다';
const PACKHOUSE_IN_USE = '화주 프로필이나 출하가 쓰는 선과장은 지울 수 없습니다';
const LAT_RANGE = [33, 39] as const;
const LON_RANGE = [124, 132] as const;

const scenario = (planSessionFixture as unknown as PlanSessionT).scenario;
const productOptions = scenario.products.map(product => ({
  product_id: product.id,
  name: product.name,
}));

const PROFILES_STORAGE_KEY = 'fs.saas.mock.shipper-profiles';

const profiles = new Map<string, OrgProfileT>();

onMockReset(() => {
  profiles.clear();
});

const readStoredProfiles = (): Record<string, OrgProfileT> => {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);

    return raw ? (JSON.parse(raw) as Record<string, OrgProfileT>) : {};
  } catch {
    return {};
  }
};

const persistProfile = (org: MockOrgT, stored: OrgProfileT) => {
  if (org.sandbox) return;
  try {
    localStorage.setItem(
      PROFILES_STORAGE_KEY,
      JSON.stringify({ ...readStoredProfiles(), [org.org_id]: stored })
    );
  } catch {
    return;
  }
};

const newPackhouseId = () => `ph-mock-${crypto.randomUUID().slice(0, 8)}`;

const seedProfile = (org: MockOrgT): OrgProfileT => {
  const shipper = scenario.shippers.find(item => org.shipper_ids.includes(item.id));
  if (!shipper) return { profile: null, packhouses: [] };

  const packhouse = scenario.packhouses.find(item => item.id === shipper.packhouse_id);
  const productIds = [
    ...new Set(scenario.lots.filter(lot => lot.shipper_id === shipper.id).map(l => l.product_id)),
  ];

  return {
    profile: {
      shipper_id: shipper.id,
      name: shipper.name,
      packhouse_id: shipper.packhouse_id,
      product_ids: productIds,
      source: SEED_SOURCE,
    },
    packhouses: packhouse
      ? [
          {
            packhouse_id: packhouse.id,
            name: packhouse.name,
            region: packhouse.region,
            lat: packhouse.lat,
            lon: packhouse.lon,
            source: SEED_SOURCE,
          },
        ]
      : [],
  };
};

const profileOf = (org: MockOrgT) => {
  const existing = profiles.get(org.org_id);
  if (existing) return existing;

  const persisted = !org.sandbox && readStoredProfiles()[org.org_id];
  if (persisted) {
    profiles.set(org.org_id, persisted);

    return persisted;
  }

  const seeded = seedProfile(org);
  profiles.set(org.org_id, seeded);

  return seeded;
};

const usedPackhouses = (org: MockOrgT, stored: OrgProfileT) =>
  new Set([
    ...(stored.profile ? [stored.profile.packhouse_id] : []),
    ...mockDb.lots
      .filter(lot => org.shipper_ids.includes(lot.shipper_id) && lot.status !== 'cancelled')
      .flatMap(lot => (lot.packhouse ? [lot.packhouse] : [])),
  ]);

const packhousesOut = (org: MockOrgT, stored: OrgProfileT): PackhouseT[] => {
  const used = usedPackhouses(org, stored);

  return stored.packhouses.map(item => ({ ...item, in_use: used.has(item.packhouse_id) }));
};

const unknownProducts = (productIds: readonly string[]) => {
  const known = new Set(productOptions.map(item => item.product_id));
  const unknown = productIds.filter(id => !known.has(id));
  if (!unknown.length) return null;

  return `없는 품목입니다: ${unknown.join(', ')}. 가능: ${[...known].sort().join(', ')}`;
};

const invalidCoordinates = ({ lat, lon }: { lat?: number | null; lon?: number | null }) => {
  if (lat != null && (lat < LAT_RANGE[0] || lat > LAT_RANGE[1])) {
    return `위도는 ${LAT_RANGE[0]}~${LAT_RANGE[1]} 범위여야 합니다`;
  }
  if (lon != null && (lon < LON_RANGE[0] || lon > LON_RANGE[1])) {
    return `경도는 ${LON_RANGE[0]}~${LON_RANGE[1]} 범위여야 합니다`;
  }

  return null;
};

export const registeredTenantOf = (org: MockOrgT) => {
  const stored = profileOf(org);
  const profile = stored?.profile;
  if (!stored || !profile || profile.source !== REGISTERED_SOURCE) return null;

  return {
    shipper: {
      id: profile.shipper_id,
      name: profile.name,
      packhouse_id: profile.packhouse_id,
      source: profile.source,
    },
    packhouses: stored.packhouses
      .filter(item => item.packhouse_id === profile.packhouse_id)
      .map(({ packhouse_id, name, region, lat, lon, source }) => ({
        id: packhouse_id,
        name,
        region,
        lat,
        lon,
        source,
      })),
  };
};

const writable = (request: Request) => {
  const principal = authorize(request, 'shipper');
  if (principal instanceof Response) return principal;
  if (principal.org.sandbox) return fail(403, SANDBOX_LOCKED);

  return principal;
};

export const shipperProfileHandlers = [
  http.get(api('/saas/shipper/profile'), ({ request }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const { org } = principal;
    const stored = profileOf(org);
    const view: ShipperProfileViewT = {
      org_id: org.org_id,
      org_name: org.org_name,
      sandbox: org.sandbox,
      ready: stored.profile !== null,
      profile: stored.profile,
      packhouses: packhousesOut(org, stored),
      product_options: productOptions,
    };

    return HttpResponse.json(view);
  }),

  http.patch(api('/saas/shipper/profile'), async ({ request }) => {
    const principal = writable(request);
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as ShipperProfilePatchT;
    const invalid = body.product_ids ? unknownProducts(body.product_ids) : null;
    if (invalid) return fail(422, invalid);

    const { org } = principal;
    const stored = profileOf(org);
    if (!stored.profile) return fail(404, PROFILE_NOT_FOUND);

    const { profile } = stored;
    if (body.packhouse_id && body.packhouse_id !== profile.packhouse_id) {
      if (!stored.packhouses.some(item => item.packhouse_id === body.packhouse_id)) {
        return fail(422, `조직의 선과장이 아닙니다: ${body.packhouse_id}`);
      }
      profile.packhouse_id = body.packhouse_id;
      mockDb.lots
        .filter(lot => lot.shipper_id === profile.shipper_id && lot.status === 'registered')
        .forEach(lot => {
          lot.packhouse = profile.packhouse_id;
        });
    }
    if (body.name?.trim()) profile.name = body.name.trim();
    if (body.product_ids) profile.product_ids = [...new Set(body.product_ids)];
    persistProfile(org, stored);

    return HttpResponse.json(profile);
  }),

  http.get(api('/saas/shipper/packhouses'), ({ request }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    return HttpResponse.json(packhousesOut(principal.org, profileOf(principal.org)));
  }),

  http.post(api('/saas/shipper/packhouses'), async ({ request }) => {
    const principal = writable(request);
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as PackhouseCreateT;
    const productIds = body.product_ids ?? [];
    const invalid =
      unknownProducts(productIds) ??
      invalidCoordinates(body) ??
      (!body.name?.trim() || !body.region?.trim() ? '선과장 이름과 지역이 필요합니다' : null);
    if (invalid) return fail(422, invalid);

    let { org } = principal;
    const stored = profileOf(org);
    const packhouse: StoredPackhouseT = {
      packhouse_id: newPackhouseId(),
      name: body.name.trim(),
      region: body.region.trim(),
      lat: body.lat,
      lon: body.lon,
      source: REGISTERED_SOURCE,
    };
    stored.packhouses.push(packhouse);

    if (!stored.profile) {
      const shipperId = `sh-mock-${org.org_id}`;
      stored.profile = {
        shipper_id: shipperId,
        name: org.org_name,
        packhouse_id: packhouse.packhouse_id,
        product_ids: [...new Set(productIds)],
        source: REGISTERED_SOURCE,
      };
      org = { ...org, shipper_ids: [...new Set([...org.shipper_ids, shipperId])] };
      moveSessionOrg(org);
    } else if (productIds.length) {
      stored.profile.product_ids = [...new Set([...stored.profile.product_ids, ...productIds])];
    }
    persistProfile(org, stored);

    const created = packhousesOut(org, stored).find(
      item => item.packhouse_id === packhouse.packhouse_id
    );

    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch(api('/saas/shipper/packhouses/:packhouseId'), async ({ request, params }) => {
    const principal = writable(request);
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as PackhousePatchT;
    const invalid = invalidCoordinates(body);
    if (invalid) return fail(422, invalid);

    const stored = profileOf(principal.org);
    const packhouse = stored.packhouses.find(item => item.packhouse_id === params.packhouseId);
    if (!packhouse) return fail(404, PACKHOUSE_NOT_FOUND);

    if (body.name?.trim()) packhouse.name = body.name.trim();
    if (body.region?.trim()) packhouse.region = body.region.trim();
    if (body.lat != null) packhouse.lat = body.lat;
    if (body.lon != null) packhouse.lon = body.lon;
    persistProfile(principal.org, stored);

    const updated = packhousesOut(principal.org, stored).find(
      item => item.packhouse_id === packhouse.packhouse_id
    );

    return HttpResponse.json(updated);
  }),

  http.delete(api('/saas/shipper/packhouses/:packhouseId'), ({ request, params }) => {
    const principal = writable(request);
    if (principal instanceof Response) return principal;

    const stored = profileOf(principal.org);
    const index = stored.packhouses.findIndex(item => item.packhouse_id === params.packhouseId);
    if (index < 0) return fail(404, PACKHOUSE_NOT_FOUND);
    if (usedPackhouses(principal.org, stored).has(String(params.packhouseId))) {
      return fail(409, PACKHOUSE_IN_USE);
    }
    stored.packhouses.splice(index, 1);
    persistProfile(principal.org, stored);

    return new HttpResponse(null, { status: 204 });
  }),
];
